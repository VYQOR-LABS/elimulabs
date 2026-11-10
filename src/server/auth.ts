import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "../lib/prisma";

const SESSION_COOKIE = "elimulabs_session";
const SESSION_DURATION = 1000 * 60 * 60 * 24 * 14;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiresAt: true, user: { select: { id: true, email: true, name: true, emailVerifiedAt: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.emailVerifiedAt) return null;
  return session.user;
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  cookieStore.delete(SESSION_COOKIE);
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function digestToken(token: string): string {
  return hashToken(token);
}
