import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";

interface ResourceDocument {
  title: string;
  grade: number;
  learningArea: string;
  strand: string;
  subStrand: string;
  content: string;
}

function resourceLines(resource: ResourceDocument): string[] {
  return [
    resource.title,
    `Grade ${resource.grade} · ${resource.learningArea}`,
    `${resource.strand} / ${resource.subStrand}`,
    "",
    ...resource.content.split(/\r?\n/),
  ];
}

export async function createResourcePdf(resource: ResourceDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let page = pdf.addPage();
  let y = page.getHeight() - 54;
  for (const line of resourceLines(resource)) {
    if (y < 48) {
      page = pdf.addPage();
      y = page.getHeight() - 48;
    }
    page.drawText(line.slice(0, 115), { x: 48, y, size: y === page.getHeight() - 54 ? 16 : 11, font });
    y -= 18;
  }
  return pdf.save();
}

export async function createResourceDocx(resource: ResourceDocument): Promise<Buffer> {
  const [title, grade, curriculum, , ...body] = resourceLines(resource);
  const document = new Document({
    sections: [{
      children: [
        new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
        new Paragraph({ children: [new TextRun({ text: grade, bold: true })] }),
        new Paragraph({ text: curriculum, style: "Subtitle" }),
        ...body.map((text) => new Paragraph({ text })),
      ],
    }],
  });
  return Packer.toBuffer(document);
}
