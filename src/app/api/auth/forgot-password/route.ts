import { TokenType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { sendPasswordResetEmail } from "../../../../server/account-tokens";
import { emailIsConfigured } from "../../../../server/email";
import { isSameOrigin, jsonError } from "../../../../server/http";
import { emailSchema } from "../../../../server/validation";
import { allowRequest } from "../../../../server/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const parsed = emailSchema.safeParse((await request.json().catch(() => null))?.email);
  if (!parsed.success) return jsonError("Enter a valid email address.", 400);
  if (!(await allowRequest("auth-password-reset", parsed.data, 3, 60 * 60 * 1000))) {
    return jsonError("Too many requests. Try again later.", 429);
  }
  if (!emailIsConfigured()) return jsonError("Password recovery is unavailable until SMTP is configured.", 503);
  const user = await prisma.user.findUnique({
    where: { email: parsed.data },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (user?.emailVerifiedAt) {
    await prisma.authToken.updateMany({
      where: { userId: user.id, type: TokenType.PASSWORD_RESET, usedAt: null },
      data: { usedAt: new Date() },
    });
    await sendPasswordResetEmail(user.id, user.email);
  }
  return NextResponse.json({ message: "If a verified account exists, password reset instructions have been sent." });
}
