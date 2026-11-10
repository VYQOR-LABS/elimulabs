import { TokenType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { digestToken } from "../../../../server/auth";
import { isSameOrigin, jsonError } from "../../../../server/http";
import { hashPassword } from "../../../../server/password";
import { passwordSchema, tokenSchema } from "../../../../server/validation";
import { allowRequest } from "../../../../server/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const schema = tokenSchema.extend({ password: passwordSchema });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter a valid reset link and a password of at least 12 characters.", 400);
  if (!(await allowRequest("auth-reset-password", parsed.data.token, 5, 60 * 60 * 1000))) {
    return jsonError("Too many reset attempts. Try again later.", 429);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const token = await tx.authToken.findFirst({
      where: {
        tokenHash: digestToken(parsed.data.token),
        type: TokenType.PASSWORD_RESET,
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
    await tx.user.update({
      where: { id: token.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    });
    await tx.session.deleteMany({ where: { userId: token.userId } });
    return true;
  });

  return updated
    ? NextResponse.json({ message: "Password updated. You can now sign in." })
    : jsonError("Password reset link is invalid or expired.", 400);
}
