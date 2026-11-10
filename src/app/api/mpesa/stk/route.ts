import {
  ActivityStatus,
  ActivityType,
  TransactionStatus,
  WalletDirection,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { createOpaqueToken, digestToken, getCurrentUser } from "../../../../server/auth";
import { isSameOrigin, jsonError } from "../../../../server/http";
import { initiateStkPush, normalizePhone } from "../../../../server/mpesa";
import { allowRequest } from "../../../../server/rate-limit";

const requestSchema = z.object({
  phone: z.string().min(9).max(20),
  amount: z.number().int().min(5).max(150_000),
});

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in to add funds.", 401);
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  const requestKey = request.headers.get("idempotency-key");
  if (!parsed.success || !requestKey || requestKey.length < 16 || requestKey.length > 128) {
    return jsonError("Enter a valid phone number and amount of at least KSh 5.", 400);
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return jsonError("Enter a valid Kenyan mobile number.", 400);
  let appUrl: URL;
  try {
    if (!process.env.APP_URL) throw new Error("Missing APP_URL.");
    appUrl = new URL(process.env.APP_URL);
    if (process.env.NODE_ENV === "production" && appUrl.protocol !== "https:") {
      throw new Error("Production callback URLs must use HTTPS.");
    }
  } catch {
    return jsonError("A valid public HTTPS callback URL must be configured for payments.", 503);
  }
  if (!(await allowRequest("mpesa-stk", user.id, 5, 60 * 60 * 1000))) {
    return jsonError("Too many top-up requests. Try again later.", 429);
  }

  const idempotencyKey = `topup:${requestKey}`;
  const previous = await prisma.mpesaPayment.findUnique({
    where: { userId_idempotencyKey: { userId: user.id, idempotencyKey } },
    select: { id: true, status: true, amount: true },
  });
  if (previous) return NextResponse.json({ payment: previous, message: "This payment request was already submitted." });

  const callbackToken = createOpaqueToken();
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.mpesaPayment.create({
      data: {
        userId: user.id,
        amount: parsed.data.amount,
        phone,
        idempotencyKey,
        callbackTokenHash: digestToken(callbackToken),
      },
    });
    const ledger = await tx.walletTransaction.create({
      data: {
        userId: user.id,
        direction: WalletDirection.CREDIT,
        amount: created.amount,
        status: TransactionStatus.PENDING,
        reference: `TOPUP:${created.id}`,
        idempotencyKey: `topup:${created.id}`,
        description: "Pending M-Pesa wallet top-up",
      },
    });
    await tx.mpesaPayment.update({
      where: { id: created.id },
      data: { transactionId: ledger.id },
    });
    await tx.activityHistory.create({
      data: {
        userId: user.id,
        type: ActivityType.WALLET_TOPUP,
        title: "M-Pesa wallet top-up",
        detail: "Payment prompt requested",
        amount: created.amount,
        status: ActivityStatus.PENDING,
        referenceId: created.id,
      },
    });
    return created;
  });

  const callbackUrl = new URL(`/api/mpesa/callback/${callbackToken}`, appUrl).toString();
  let stk: Awaited<ReturnType<typeof initiateStkPush>>;
  try {
    stk = await initiateStkPush({
      phone,
      amount: payment.amount,
      accountReference: `EL-${payment.id}`,
      callbackUrl,
    });
  } catch (error) {
    await prisma.$transaction([
      prisma.mpesaPayment.updateMany({
        where: { id: payment.id, status: TransactionStatus.PENDING },
        data: { status: TransactionStatus.FAILED },
      }),
      prisma.walletTransaction.updateMany({
        where: { idempotencyKey: `topup:${payment.id}`, status: TransactionStatus.PENDING },
        data: { status: TransactionStatus.FAILED },
      }),
      prisma.activityHistory.updateMany({
        where: { userId: user.id, referenceId: payment.id, status: ActivityStatus.PENDING },
        data: { status: ActivityStatus.FAILED, detail: "M-Pesa request could not be initiated." },
      }),
    ]);
    const message = error instanceof Error ? error.message : "M-Pesa request failed.";
    console.error("Could not initiate M-Pesa top-up.", error);
    return jsonError(message.includes("not configured") ? message : "Could not initiate the M-Pesa request.", message.includes("not configured") ? 503 : 502);
  }

  try {
    const updated = await prisma.mpesaPayment.update({
      where: { id: payment.id },
      data: {
        merchantRequestId: stk.merchantRequestId,
        checkoutRequestId: stk.checkoutRequestId,
      },
      select: { id: true, amount: true, status: true },
    });
    return NextResponse.json({ payment: updated, message: "Approve the payment prompt on your phone." }, { status: 202 });
  } catch (error) {
    console.error("M-Pesa accepted the prompt, but the request reference could not be stored.", error);
    return jsonError("The payment prompt may have been sent. Refresh your wallet before retrying.", 503);
  }
}
