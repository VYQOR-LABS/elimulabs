import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../server/auth";
import { jsonError } from "../../../../server/http";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in to continue.", 401);
  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
    select: { balance: true },
  });
  return NextResponse.json({ user, balance: wallet?.balance ?? 0 });
}
