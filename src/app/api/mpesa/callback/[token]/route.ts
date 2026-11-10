import { ActivityStatus, TransactionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { digestToken } from "../../../../../server/auth";

const callbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number().int(),
      ResultDesc: z.string().optional(),
      CallbackMetadata: z.object({
        Item: z.array(z.object({ Name: z.string(), Value: z.union([z.string(), z.number()]) })),
      }).optional(),
    }),
  }),
});

function callbackValue(items: Array<{ Name: string; Value: string | number }>, name: string): string | number | undefined {
  return items.find((item) => item.Name === name)?.Value;
}

async function failPendingPayment(
  paymentId: string,
  userId: string,
  resultCode: number,
  detail: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.mpesaPayment.updateMany({
      where: { id: paymentId, status: TransactionStatus.PENDING },
      data: { status: TransactionStatus.FAILED, resultCode },
    }),
    prisma.walletTransaction.updateMany({
      where: { idempotencyKey: `topup:${paymentId}`, status: TransactionStatus.PENDING },
      data: { status: TransactionStatus.FAILED },
    }),
    prisma.activityHistory.updateMany({
      where: { userId, referenceId: paymentId, status: ActivityStatus.PENDING },
      data: { status: ActivityStatus.FAILED, detail },
    }),
  ]);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await context.params;
  const payment = await prisma.mpesaPayment.findFirst({
    where: { callbackTokenHash: digestToken(token) },
  });
  if (!payment) return NextResponse.json({ error: "Unknown payment callback." }, { status: 404 });
  const parsed = callbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid callback payload." }, { status: 400 });
  const callback = parsed.data.Body.stkCallback;
  if (
    (payment.checkoutRequestId && callback.CheckoutRequestID !== payment.checkoutRequestId) ||
    (payment.merchantRequestId && callback.MerchantRequestID !== payment.merchantRequestId)
  ) {
    return NextResponse.json({ error: "Payment reference mismatch." }, { status: 400 });
  }
  if (payment.status !== TransactionStatus.PENDING) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Callback already processed." });
  }

  if (callback.ResultCode !== 0) {
    await failPendingPayment(payment.id, payment.userId, callback.ResultCode, callback.ResultDesc ?? "Payment was not completed.");
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Payment failure recorded." });
  }

  const items = callback.CallbackMetadata?.Item ?? [];
  const amount = callbackValue(items, "Amount");
  const receipt = callbackValue(items, "MpesaReceiptNumber");
  if (Number(amount) !== payment.amount || typeof receipt !== "string" || receipt.length < 4) {
    await failPendingPayment(payment.id, payment.userId, -1, "Payment details did not match.");
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Payment details did not match." });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.mpesaPayment.findUniqueOrThrow({ where: { id: payment.id } });
      if (
        (current.checkoutRequestId && current.checkoutRequestId !== callback.CheckoutRequestID) ||
        (current.merchantRequestId && current.merchantRequestId !== callback.MerchantRequestID)
      ) {
        throw new Error("Payment reference mismatch.");
      }
      const claimed = await tx.mpesaPayment.updateMany({
        where: { id: payment.id, status: TransactionStatus.PENDING, amount: payment.amount },
        data: {
          status: TransactionStatus.COMPLETED,
          resultCode: callback.ResultCode,
          checkoutRequestId: callback.CheckoutRequestID,
          merchantRequestId: callback.MerchantRequestID,
          mpesaReceiptNumber: receipt,
          completedAt: new Date(),
        },
      });
      if (!claimed.count) return;
      await tx.wallet.upsert({
        where: { userId: payment.userId },
        create: { userId: payment.userId, balance: payment.amount },
        update: { balance: { increment: payment.amount } },
      });
      const ledger = await tx.walletTransaction.updateMany({
        where: {
          idempotencyKey: `topup:${payment.id}`,
          status: TransactionStatus.PENDING,
          amount: payment.amount,
        },
        data: {
          status: TransactionStatus.COMPLETED,
          reference: receipt,
          description: "Confirmed M-Pesa wallet top-up",
          completedAt: new Date(),
        },
      });
      if (!ledger.count) throw new Error("Pending wallet transaction was not found.");
      await tx.mpesaPayment.update({
        where: { id: payment.id },
        data: { transactionId: payment.transactionId },
      });
      await tx.activityHistory.updateMany({
        where: { userId: payment.userId, referenceId: payment.id, status: ActivityStatus.PENDING },
        data: { detail: `Receipt ${receipt}`, status: ActivityStatus.COMPLETED },
      });
    });
  } catch (error) {
    console.error("M-Pesa callback processing failed.", error);
    return NextResponse.json({ error: "Callback processing failed." }, { status: 500 });
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Payment processed." });
}
