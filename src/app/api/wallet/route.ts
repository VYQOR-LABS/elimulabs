import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../server/auth";
import { jsonError } from "../../../server/http";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in to view your wallet.", 401);
  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
    select: { balance: true, updatedAt: true },
  });
  if (!wallet) return jsonError("Wallet account was not found.", 404);
  const activities = await prisma.activityHistory.findMany({
    where: { userId: user.id, type: "WALLET_TOPUP" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ ...wallet, activities });
}
