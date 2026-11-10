import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";

const querySchema = z.string().cuid();

export async function GET(request: Request): Promise<NextResponse> {
  const areaId = querySchema.safeParse(new URL(request.url).searchParams.get("areaId"));
  if (!areaId.success) return NextResponse.json({ error: "Select a learning area." }, { status: 400 });
  const learningArea = await prisma.learningArea.findUnique({
    where: { id: areaId.data },
    include: { strands: { orderBy: { name: "asc" }, select: { id: true, name: true } } },
  });
  return NextResponse.json({ strands: learningArea?.strands ?? [] });
}
