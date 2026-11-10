"use client";

import { z } from "zod";
import DocumentDownloads from "./DocumentDownloads";

const sectionSchema = z.object({ heading: z.string(), content: z.string() });
const documentSchema = z.object({
  title: z.string(),
  sections: z.array(sectionSchema).optional(),
  questions: z.array(z.object({
    number: z.number(),
    kind: z.string(),
    marks: z.number(),
    text: z.string(),
    options: z.array(z.string()).optional(),
  })).optional(),
  markingScheme: z.array(z.object({
    questionNumber: z.number(),
    answer: z.string(),
    marks: z.number(),
  })).optional(),
});

export default function DocumentPreview({
  id,
  rawContent,
}: {
  id: string;
  rawContent: string;
}): React.ReactElement {
  let value: unknown;
  try {
    value = JSON.parse(rawContent) as unknown;
  } catch {
    return <p role="alert" className="text-sm text-red-700">Generated document could not be displayed.</p>;
  }
  const parsed = documentSchema.safeParse(value);
  if (!parsed.success) {
    return <p role="alert" className="text-sm text-red-700">Generated document could not be displayed.</p>;
  }
  const document = parsed.data;
  return (
    <article className="panel-card mt-5 print-content">
      <p className="eyebrow">GENERATED DOCUMENT</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">{document.title}</h2>
      {document.sections?.map((section) => (
        <section key={section.heading} className="mt-5">
          <h3 className="font-semibold text-slate-900">{section.heading}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{section.content}</p>
        </section>
      ))}
      {document.questions && (
        <section className="mt-5 space-y-4">
          {document.questions.map((question) => (
            <div className="rounded-xl border border-slate-200 p-4" key={question.number}>
              <p className="font-medium text-slate-900">{question.number}. {question.text} <span className="text-xs text-slate-500">({question.marks} marks)</span></p>
              {question.options?.map((option) => <p className="mt-2 pl-4 text-sm text-slate-600" key={option}>{option}</p>)}
            </div>
          ))}
          <h3 className="pt-3 font-semibold text-slate-900">Marking scheme</h3>
          {document.markingScheme?.map((item) => (
            <p className="text-sm leading-6 text-slate-700" key={item.questionNumber}>
              {item.questionNumber}. {item.answer} <span className="text-slate-500">({item.marks} marks)</span>
            </p>
          ))}
        </section>
      )}
      <DocumentDownloads documentId={id} />
    </article>
  );
}
