import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";

export async function allowRequest(
  action: string,
  identity: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  await prisma.rateLimitBucket.deleteMany({
    where: { expiresAt: { lte: new Date(now) } },
  });
  const bucket = Math.floor(now / windowMs);
  const key = createHash("sha256")
    .update(`${action}:${identity}:${bucket}`)
    .digest("hex");
  const row = await prisma.rateLimitBucket.upsert({
    where: { key },
    create: { key, count: 1, expiresAt: new Date((bucket + 1) * windowMs) },
    update: { count: { increment: 1 } },
  });
  return row.count <= limit;
}
