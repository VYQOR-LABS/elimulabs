import { TokenType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { createOpaqueToken, digestToken } from "./auth";
import { sendAccountEmail } from "./email";

const TOKEN_LIFETIME = 1000 * 60 * 30;

export async function sendVerificationEmail(
  userId: string,
  email: string,
): Promise<void> {
  const token = createOpaqueToken();
  await prisma.authToken.create({
    data: {
      userId,
      type: TokenType.EMAIL_VERIFICATION,
      tokenHash: digestToken(token),
      expiresAt: new Date(Date.now() + TOKEN_LIFETIME),
    },
  });
  const link = new URL("/verify", process.env.APP_URL ?? "http://localhost:3000");
  link.searchParams.set("token", token);
  await sendAccountEmail(email, "Verify your ElimuLabs email", `Verify your account: ${link}`);
}

export async function sendPasswordResetEmail(
  userId: string,
  email: string,
): Promise<void> {
  const token = createOpaqueToken();
  await prisma.authToken.create({
    data: {
      userId,
      type: TokenType.PASSWORD_RESET,
      tokenHash: digestToken(token),
      expiresAt: new Date(Date.now() + TOKEN_LIFETIME),
    },
  });
  const link = new URL("/reset-password", process.env.APP_URL ?? "http://localhost:3000");
  link.searchParams.set("token", token);
  await sendAccountEmail(email, "Reset your ElimuLabs password", `Reset your password: ${link}`);
}
