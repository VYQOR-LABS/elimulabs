import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../server/auth";
import { createDocumentDocx, createDocumentPdf } from "../../../../../server/document-export";
import { jsonError } from "../../../../../server/http";

const formatSchema = z.enum(["pdf", "docx"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in to download this document.", 401);
  const { documentId } = await context.params;
  const format = formatSchema.safeParse(new URL(request.url).searchParams.get("format"));
  if (!format.success) return jsonError("Select PDF or Word format.", 400);
  const document = await prisma.generatedDocument.findFirst({
    where: { id: documentId, userId: user.id },
    select: { title: true, content: true },
  });
  if (!document) return jsonError("Document was not found.", 404);

  try {
    const file = format.data === "pdf"
      ? await createDocumentPdf(document.content)
      : await createDocumentDocx(document.content);
    const name = document.title.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "");
    return new Response(file as BodyInit, {
      headers: {
        "Content-Type": format.data === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name}.${format.data}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Generated document export failed.", error);
    return jsonError("The document file could not be generated.", 500);
  }
}
