import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";

interface ExportSection {
  heading: string;
  content: string;
}

interface ExportDocument {
  title: string;
  sections?: ExportSection[];
  questions?: Array<{ number: number; text: string; marks: number; options?: string[] }>;
  markingScheme?: Array<{ questionNumber: number; answer: string; marks: number }>;
}

function documentLines(document: ExportDocument): string[] {
  const lines = [document.title];
  for (const section of document.sections ?? []) {
    lines.push("", section.heading, section.content);
  }
  if (document.questions) {
    lines.push("", "Examination");
    for (const question of document.questions) {
      lines.push(`${question.number}. ${question.text} (${question.marks} marks)`, ...(question.options ?? []));
    }
    lines.push("", "Marking scheme");
    for (const item of document.markingScheme ?? []) {
      lines.push(`${item.questionNumber}. ${item.answer} (${item.marks} marks)`);
    }
  }
  return lines;
}

export async function createDocumentPdf(raw: string): Promise<Uint8Array> {
  const document = JSON.parse(raw) as ExportDocument;
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let page = pdf.addPage();
  let y = page.getHeight() - 50;
  for (const paragraph of documentLines(document)) {
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      if (font.widthOfTextAtSize(`${line} ${word}`, 10) > page.getWidth() - 96) {
        if (y < 48) { page = pdf.addPage(); y = page.getHeight() - 48; }
        page.drawText(line, { x: 48, y, size: 10, font });
        y -= 15;
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (y < 48) { page = pdf.addPage(); y = page.getHeight() - 48; }
    page.drawText(line, { x: 48, y, size: y === page.getHeight() - 50 ? 16 : 10, font });
    y -= 18;
  }
  return pdf.save();
}

export async function createDocumentDocx(raw: string): Promise<Buffer> {
  const document = JSON.parse(raw) as ExportDocument;
  const children: Paragraph[] = [
    new Paragraph({ text: document.title, heading: HeadingLevel.TITLE }),
  ];
  for (const section of document.sections ?? []) {
    children.push(
      new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: section.content }),
    );
  }
  if (document.questions) {
    children.push(new Paragraph({ text: "Examination", heading: HeadingLevel.HEADING_1 }));
    for (const question of document.questions) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `${question.number}. ${question.text} (${question.marks} marks)`, bold: true })],
      }));
      for (const option of question.options ?? []) children.push(new Paragraph({ text: option, bullet: { level: 0 } }));
    }
    children.push(new Paragraph({ text: "Marking scheme", heading: HeadingLevel.HEADING_1 }));
    for (const item of document.markingScheme ?? []) {
      children.push(new Paragraph({ text: `${item.questionNumber}. ${item.answer} (${item.marks} marks)` }));
    }
  }
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}
