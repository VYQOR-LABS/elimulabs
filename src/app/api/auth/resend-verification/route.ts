import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { sendVerificationEmail } from "../../../../server/account-tokens";
import { emailIsConfigured } from "../../../../server/email";
import { isSameOrigin, jsonError } from "../../../../server/http";
import { emailSchema } from "../../../../server/validation";
import { allowRequest } from "../../../../server/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const parsed = emailSchema.safeParse((await request.json().catch(() => null))?.email);
  if (!parsed.success) return jsonError("Enter a valid email address.", 400);
  if (!(await allowRequest("auth-resend-verification", parsed.data, 3, 60 * 60 * 1000))) {
    return jsonError("Too many requests. Try again later.", 429);
  }
  if (!emailIsConfigured()) return jsonError("Email verification is unavailable until SMTP is configured.", 503);
  const user = await prisma.user.findUnique({ where: { email: parsed.data } });
  if (user && !user.emailVerifiedAt) await sendVerificationEmail(user.id, user.email);
  return NextResponse.json({ message: "If the account needs verification, a link has been sent." });
}
