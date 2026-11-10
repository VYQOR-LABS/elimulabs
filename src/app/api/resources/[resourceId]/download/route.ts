import { ActivityStatus, ActivityType, TransactionStatus, WalletDirection } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../server/auth";
import { createResourceDocx, createResourcePdf } from "../../../../../server/resource-export";
import { isSameOrigin, jsonError } from "../../../../../server/http";
import { PRICES } from "../../../../../server/pricing";

const formatSchema = z.enum(["pdf", "docx"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ resourceId: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in to download this resource.", 401);
  const { resourceId } = await context.params;
  const format = formatSchema.safeParse(new URL(request.url).searchParams.get("format"));
  const key = request.headers.get("idempotency-key");
  if (!format.success || !key || key.length < 16 || key.length > 128) {
    return jsonError("Select a valid download format.", 400);
  }
  const idempotencyKey = `resource:${format.data}:${key}`;
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, isPublished: true },
    include: { subStrand: { include: { strand: { include: { learningArea: { include: { grade: true } } } } } } },
  });
  if (!resource) return jsonError("This resource is not available.", 404);
  const previous = await prisma.walletTransaction.findUnique({
    where: { userId_idempotencyKey: { userId: user.id, idempotencyKey } },
  });

  let file: Uint8Array | Buffer;
  try {
    const area = resource.subStrand.strand.learningArea;
    const document = {
      title: resource.title,
      grade: area.grade.number,
      learningArea: area.name,
      strand: resource.subStrand.strand.name,
      subStrand: resource.subStrand.name,
      content: resource.content,
    };
    file = format.data === "pdf"
      ? await createResourcePdf(document)
      : await createResourceDocx(document);
  } catch (error) {
    console.error("Resource file generation failed.", error);
    return jsonError("The resource file could not be generated. No charge was made.", 500);
  }

  if (!previous) {
    const activityType = format.data === "pdf" ? ActivityType.RESOURCE_PDF : ActivityType.RESOURCE_DOCX;
    const amount = format.data === "pdf" ? PRICES.RESOURCE_PDF : PRICES.RESOURCE_DOCX;
    try {
      await prisma.$transaction(async (tx) => {
        const debited = await tx.wallet.updateMany({
          where: { userId: user.id, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (!debited.count) throw new Error("Insufficient wallet balance.");
        await tx.walletTransaction.create({
          data: {
            userId: user.id,
            direction: WalletDirection.DEBIT,
            amount,
            status: TransactionStatus.COMPLETED,
            description: `${format.data.toUpperCase()} download: ${resource.title}`,
            idempotencyKey,
            completedAt: new Date(),
          },
        });
        await tx.activityHistory.create({
          data: {
            userId: user.id,
            type: activityType,
            title: `${resource.title} (${format.data.toUpperCase()})`,
            detail: `${resource.subStrand.strand.learningArea.name} · Grade ${resource.subStrand.strand.learningArea.grade.number}`,
            amount: -amount,
            status: ActivityStatus.COMPLETED,
          },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Insufficient wallet balance.") {
        return jsonError(`This download costs KSh ${amount}. Top up your wallet to continue.`, 402);
      }
      console.error("Resource download charge failed.", error);
      return jsonError("Could not complete the download. No charge was made.", 500);
    }
  }

  const extension = format.data;
  const safeName = resource.title.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "");
  const contentType = format.data === "pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return new Response(file as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeName}.${extension}"`,
      "Cache-Control": "no-store",
    },
  });
}
