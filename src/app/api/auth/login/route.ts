import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createSession } from "../../../../server/auth";
import { isSameOrigin, jsonError } from "../../../../server/http";
import { verifyPassword } from "../../../../server/password";
import { loginSchema } from "../../../../server/validation";
import { allowRequest } from "../../../../server/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter a valid email and password.", 400);
  if (!(await allowRequest("auth-login", parsed.data.email, 8, 15 * 60 * 1000))) {
    return jsonError("Too many sign-in attempts. Try again later.", 429);
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return jsonError("Email or password is incorrect.", 401);
  }
  if (!user.emailVerifiedAt) return jsonError("Verify your email before signing in.", 403);

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}
