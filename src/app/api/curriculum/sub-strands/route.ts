import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";

const querySchema = z.object({
  areaId: z.string().cuid().optional(),
  strandId: z.string().cuid().optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    areaId: params.get("areaId") || undefined,
    strandId: params.get("strandId") || undefined,
  });
  if (!parsed.success || Boolean(parsed.data.areaId) === Boolean(parsed.data.strandId)) {
    return NextResponse.json({ error: "Select a learning area or strand." }, { status: 400 });
  }
  const subStrands = await prisma.subStrand.findMany({
    where: {
      ...(parsed.data.strandId ? { strandId: parsed.data.strandId } : {}),
      ...(parsed.data.areaId ? { strand: { learningAreaId: parsed.data.areaId } } : {}),
    },
    include: { strand: { select: { name: true } } },
    orderBy: [{ strand: { name: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json({
    subStrands: subStrands.map(({ id, name, strandId, strand }) => ({
      id,
      name,
      strandId,
      strandName: strand.name,
    })),
  });
}
