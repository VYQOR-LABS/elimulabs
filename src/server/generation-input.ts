import { z } from "zod";
import { prisma } from "../lib/prisma";

const common = {
  areaId: z.string().cuid(),
  grade: z.number().int().min(1).max(12),
  prompt: z.string().max(2000).optional().default(""),
};

const schemeSchema = z.object({
  ...common,
  type: z.literal("SCHEME_OF_WORK"),
  year: z.number().int().min(2020).max(2100),
  term: z.enum(["Term 1", "Term 2", "Term 3"]),
  weeks: z.number().int().min(1).max(24),
  lessonsPerWeek: z.number().int().min(1).max(20),
  halfTermWeek: z.number().int().min(1).max(24).nullable(),
  subStrandIds: z.array(z.string().cuid()).min(1).max(100),
});

const lessonSchema = z.object({
  ...common,
  type: z.literal("LESSON_PLAN"),
  strandId: z.string().cuid(),
  subStrandId: z.string().cuid(),
  lessonDetails: z.string().min(5).max(2000),
  objectives: z.string().min(5).max(2000),
});

const recordsSchema = z.object({
  ...common,
  type: z.literal("RECORDS_OF_WORK"),
  year: z.number().int().min(2020).max(2100),
  term: z.enum(["Term 1", "Term 2", "Term 3"]),
  subStrandIds: z.array(z.string().cuid()).min(1).max(100),
});

const examSchema = z.object({
  ...common,
  type: z.literal("EXAM"),
  year: z.number().int().min(2020).max(2100),
  term: z.enum(["Term 1", "Term 2", "Term 3"]),
  mcqCount: z.number().int().min(1).max(80),
  mcqMarks: z.number().int().min(1).max(200),
  structuredCount: z.number().int().min(1).max(30),
  structuredMarks: z.number().int().min(1).max(300),
  requiredTotal: z.number().int().min(1).max(500),
});

export const generationSchema = z.discriminatedUnion("type", [
  schemeSchema,
  lessonSchema,
  recordsSchema,
  examSchema,
]);

export type GenerationInput = z.infer<typeof generationSchema>;

export async function resolveGenerationInput(input: GenerationInput): Promise<{
  area: { id: string; name: string; grade: number };
  curriculum: Array<{ strand: string; subStrand: string }>;
}> {
  const area = await prisma.learningArea.findUnique({
    where: { id: input.areaId },
    include: { grade: { select: { number: true } } },
  });
  if (!area || area.grade.number !== input.grade) {
    throw new Error("The selected learning area does not match the grade.");
  }

  if (input.type === "LESSON_PLAN") {
    const subStrand = await prisma.subStrand.findFirst({
      where: { id: input.subStrandId, strandId: input.strandId, strand: { learningAreaId: input.areaId } },
      include: { strand: { select: { name: true } } },
    });
    if (!subStrand) throw new Error("The selected curriculum items do not match.");
    return {
      area: { id: area.id, name: area.name, grade: area.grade.number },
      curriculum: [{ strand: subStrand.strand.name, subStrand: subStrand.name }],
    };
  }

  if (input.type === "SCHEME_OF_WORK" || input.type === "RECORDS_OF_WORK") {
    if (input.type === "SCHEME_OF_WORK" && input.halfTermWeek && input.halfTermWeek > input.weeks) {
      throw new Error("Half-term week must fall within the selected term.");
    }
    const selected = await prisma.subStrand.findMany({
      where: {
        id: { in: input.subStrandIds },
        strand: { learningAreaId: input.areaId },
      },
      include: { strand: { select: { name: true } } },
    });
    if (selected.length !== new Set(input.subStrandIds).size) {
      throw new Error("One or more selected curriculum items do not belong to this learning area.");
    }
    return {
      area: { id: area.id, name: area.name, grade: area.grade.number },
      curriculum: selected.map((item) => ({ strand: item.strand.name, subStrand: item.name })),
    };
  }

  return {
    area: { id: area.id, name: area.name, grade: area.grade.number },
    curriculum: [],
  };
}
