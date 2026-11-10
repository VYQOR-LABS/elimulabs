import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../server/auth";
import { jsonError } from "../../../server/http";

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in to view your activity.", 401);
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Invalid history page.", 400);
  const { cursor, limit } = parsed.data;
  const rows = await prisma.activityHistory.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > limit;
  const entries = hasMore ? rows.slice(0, limit) : rows;
  return NextResponse.json({
    entries,
    nextCursor: hasMore ? entries.at(-1)?.id ?? null : null,
  });
}
