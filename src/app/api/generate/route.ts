import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../server/auth";
import { generateAndCharge } from "../../../server/generation";
import { generationSchema } from "../../../server/generation-input";
import { isSameOrigin, jsonError } from "../../../server/http";
import { allowRequest } from "../../../server/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const parsed = generationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Check the required fields and try again.", 400);
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in to generate a document.", 401);
  if (!(await allowRequest("document-generation", user.id, 5, 60 * 60 * 1000))) {
    return jsonError("Generation limit reached. Try again later.", 429);
  }
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    return jsonError("A valid operation key is required.", 400);
  }

  try {
    const result = await generateAndCharge(user.id, parsed.data, `${parsed.data.type}:${idempotencyKey}`);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document generation failed.";
    if (message.startsWith("Insufficient balance")) return jsonError(message, 402);
    if (message.includes("not configured")) return jsonError(message, 503);
    if (
      message.includes("selected") ||
      message.includes("marks") ||
      message.includes("half-term") ||
      message.includes("curriculum")
    ) return jsonError(message, 400);
    console.error("Document generation failed.", error);
    return jsonError("Could not generate the requested document. No wallet deduction was made.", 502);
  }
}
