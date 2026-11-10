import { NextResponse } from "next/server";

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const expectedOrigin = process.env.APP_URL
      ? new URL(process.env.APP_URL).origin
      : new URL(request.url).origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}
