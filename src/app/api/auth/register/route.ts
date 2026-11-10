import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { emailIsConfigured } from "../../../../server/email";
import { isSameOrigin, jsonError } from "../../../../server/http";
import { hashPassword } from "../../../../server/password";
import { registerSchema } from "../../../../server/validation";
import { sendVerificationEmail } from "../../../../server/account-tokens";
import { allowRequest } from "../../../../server/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter a valid email and a password of at least 12 characters.", 400);
  if (!(await allowRequest("auth-register", parsed.data.email, 5, 60 * 60 * 1000))) {
    return jsonError("Too many registration attempts. Try again later.", 429);
  }
  if (!emailIsConfigured()) return jsonError("Account verification email is unavailable until SMTP is configured.", 503);

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (exists) return jsonError("An account already uses this email address.", 409);

  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        wallet: { create: {} },
      },
      select: { id: true, email: true },
    });
    try {
      await sendVerificationEmail(user.id, user.email);
    } catch (error) {
      console.error("Verification email could not be sent.", error);
      return jsonError("Account created, but the verification email could not be sent. Request a new link.", 503);
    }
    return NextResponse.json({ message: "Check your email for an account verification link." }, { status: 201 });
  } catch (error) {
    console.error("Account registration failed.", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("An account already uses this email address.", 409);
    }
    return jsonError("Could not create the account. Please try again.", 500);
  }
}
