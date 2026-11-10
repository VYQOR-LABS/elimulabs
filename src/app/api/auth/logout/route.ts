import { NextResponse } from "next/server";
import { deleteCurrentSession } from "../../../../server/auth";
import { isSameOrigin, jsonError } from "../../../../server/http";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  await deleteCurrentSession();
  return NextResponse.json({ message: "Signed out." });
}
