import { ActivityStatus, ActivityType, TransactionStatus, WalletDirection } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../server/auth";
import { isSameOrigin, jsonError } from "../../../../server/http";
import { PRICES } from "../../../../server/pricing";
import { z } from "zod";

const requestSchema = z.object({ subStrandId: z.string().cuid() });

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in to view this resource.", 401);
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  const key = request.headers.get("idempotency-key");
  if (!parsed.success || !key || key.length < 16 || key.length > 128) {
    return jsonError("Select a valid resource and try again.", 400);
  }
  const idempotencyKey = `resource:view:${key}`;
  const existing = await prisma.walletTransaction.findUnique({
    where: { userId_idempotencyKey: { userId: user.id, idempotencyKey } },
  });
  const resource = await prisma.resource.findFirst({
    where: { subStrandId: parsed.data.subStrandId, isPublished: true },
    include: { subStrand: { include: { strand: { include: { learningArea: { include: { grade: true } } } } } } },
  });
  if (!resource) return jsonError("No published resource is available for this sub-strand.", 404);
  if (existing) {
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id }, select: { balance: true } });
    return NextResponse.json({ resource, balance: wallet?.balance ?? 0, alreadyCompleted: true });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const debited = await tx.wallet.updateMany({
        where: { userId: user.id, balance: { gte: PRICES.RESOURCE_VIEW } },
        data: { balance: { decrement: PRICES.RESOURCE_VIEW } },
      });
      if (!debited.count) throw new Error("Insufficient wallet balance.");
      await tx.walletTransaction.create({
        data: {
          userId: user.id,
          direction: WalletDirection.DEBIT,
          amount: PRICES.RESOURCE_VIEW,
          status: TransactionStatus.COMPLETED,
          idempotencyKey,
          description: `View resource: ${resource.title}`,
          completedAt: new Date(),
        },
      });
      await tx.activityHistory.create({
        data: {
          userId: user.id,
          type: ActivityType.RESOURCE_VIEW,
          title: resource.title,
          detail: `${resource.subStrand.strand.learningArea.name} · Grade ${resource.subStrand.strand.learningArea.grade.number}`,
          amount: -PRICES.RESOURCE_VIEW,
          status: ActivityStatus.COMPLETED,
        },
      });
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: user.id }, select: { balance: true } });
      return wallet;
    });
    return NextResponse.json({ resource, balance: result.balance, alreadyCompleted: false });
  } catch (error) {
    if (error instanceof Error && error.message === "Insufficient wallet balance.") {
      return jsonError(`Viewing this resource costs KSh ${PRICES.RESOURCE_VIEW}. Top up your wallet to continue.`, 402);
    }
    console.error("Resource view operation failed.", error);
    return jsonError("Could not complete the resource request.", 500);
  }
}
