import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { grades } from "../../../../server/validation";

export async function GET(request: Request): Promise<NextResponse> {
  const grade = Number(new URL(request.url).searchParams.get("grade"));
  const valid = grades.safeParse(grade);
  if (!valid.success) return NextResponse.json({ error: "Select a grade from 1 to 12." }, { status: 400 });
  const row = await prisma.curriculumGrade.findUnique({
    where: { number: grade },
    include: { learningAreas: { orderBy: { name: "asc" }, select: { id: true, name: true } } },
  });
  return NextResponse.json({ learningAreas: row?.learningAreas ?? [] });
}
