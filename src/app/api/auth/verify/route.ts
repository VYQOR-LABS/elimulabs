import { TokenType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { digestToken } from "../../../../server/auth";
import { isSameOrigin, jsonError } from "../../../../server/http";
import { tokenSchema } from "../../../../server/validation";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const parsed = tokenSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Verification link is invalid or expired.", 400);
  const tokenHash = digestToken(parsed.data.token);

  const verified = await prisma.$transaction(async (tx) => {
    const token = await tx.authToken.findFirst({
      where: {
        tokenHash,
        type: TokenType.EMAIL_VERIFICATION,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userId: true },
    });
    if (!token) return false;
    const claimed = await tx.authToken.updateMany({
      where: { id: token.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (!claimed.count) return false;
    await tx.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } });
    return true;
  });

  return verified
    ? NextResponse.json({ message: "Email verified. You can now sign in." })
    : jsonError("Verification link is invalid or expired.", 400);
}
