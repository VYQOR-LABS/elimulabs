import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(): Promise<NextResponse> {
  const grades = await prisma.curriculumGrade.findMany({
    orderBy: { number: "asc" },
    select: { number: true },
  });
  return NextResponse.json({ grades: grades.map((grade) => grade.number) });
}
