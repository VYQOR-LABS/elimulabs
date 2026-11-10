import { z } from "zod";

const sectionSchema = z.object({
  heading: z.string().min(2).max(120),
  content: z.string().min(10).max(10000),
});

const documentSchema = z.object({
  title: z.string().min(3).max(180),
  sections: z.array(sectionSchema).min(2).max(30),
});

const examSchema = z.object({
  title: z.string().min(3).max(180),
  questions: z.array(z.discriminatedUnion("kind", [
    z.object({
      number: z.number().int().positive(),
      kind: z.literal("multiple-choice"),
      marks: z.number().int().positive(),
      text: z.string().min(5).max(2000),
      options: z.array(z.string().min(1).max(300)).length(4),
    }),
    z.object({
      number: z.number().int().positive(),
      kind: z.literal("structured"),
      marks: z.number().int().positive(),
      text: z.string().min(5).max(2000),
      options: z.array(z.string().min(1).max(300)).optional(),
    }),
  ])).min(1).max(100),
  markingScheme: z.array(z.object({
    questionNumber: z.number().int().positive(),
    answer: z.string().min(1).max(2000),
    marks: z.number().int().positive(),
  })).min(1).max(100),
});

export type GeneratedDocument = z.infer<typeof documentSchema>;
export type GeneratedExam = z.infer<typeof examSchema>;

async function requestJson(system: string, input: unknown): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("AI generation is unavailable until OPENAI_API_KEY is configured.");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(input) },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    console.error("AI provider returned an unsuccessful status.", response.status);
    throw new Error("The document service could not complete the request.");
  }
  const body: unknown = await response.json();
  const content = z.object({
    choices: z.array(z.object({
      message: z.object({ content: z.string().min(1) }),
    })).min(1),
  }).parse(body).choices[0].message.content;
  return JSON.parse(content) as unknown;
}

export async function generateDocument(input: unknown): Promise<GeneratedDocument> {
  const result = await requestJson(
    "Create a practical teacher document. Return JSON with title and sections (heading and content). Do not invent official curriculum claims. Honor all supplied constraints exactly.",
    input,
  );
  return documentSchema.parse(result);
}

export async function generateExam(input: unknown): Promise<GeneratedExam> {
  return validateExam(await requestJson(
    "Generate a classroom assessment as JSON with title, questions, and markingScheme. Each question needs a unique number, kind, marks, and text; multiple choice questions need four options. Every question must have exactly one marking scheme entry with the same number and same marks. Match the requested question counts and marks exactly.",
    input,
  ));
}

export function validateExam(value: unknown): GeneratedExam {
  const result = examSchema.parse(value);
  const questionNumbers = result.questions.map((question) => question.number);
  const markNumbers = result.markingScheme.map((item) => item.questionNumber);
  if (
    new Set(questionNumbers).size !== questionNumbers.length ||
    result.markingScheme.length !== result.questions.length ||
    questionNumbers.some((number) => !markNumbers.includes(number)) ||
    result.questions.some((question) =>
      result.markingScheme.find((item) => item.questionNumber === question.number)?.marks !== question.marks,
    )
  ) {
    throw new Error("The generated marking scheme does not match the examination.");
  }
  return result;
}

export function validateExamRequirements(
  exam: GeneratedExam,
  expected: {
    multipleChoiceCount: number;
    multipleChoiceMarksEach: number;
    structuredCount: number;
    structuredMarksEach: number;
    totalMarks: number;
  },
): void {
  const multipleChoice = exam.questions.filter((question) => question.kind === "multiple-choice");
  const structured = exam.questions.filter((question) => question.kind === "structured");
  if (
    multipleChoice.length !== expected.multipleChoiceCount ||
    structured.length !== expected.structuredCount ||
    multipleChoice.some((question) => question.marks !== expected.multipleChoiceMarksEach) ||
    structured.some((question) => question.marks !== expected.structuredMarksEach) ||
    exam.questions.reduce((sum, question) => sum + question.marks, 0) !== expected.totalMarks
  ) {
    throw new Error("The generated examination does not match the requested question counts and total.");
  }
}
