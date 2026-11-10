import { PrismaClient } from "@prisma/client";
import { gradeAreas, sampleResourceContent, sampleStrands } from "./seed-data";

const prisma = new PrismaClient();

async function seedCurriculum(): Promise<void> {
  for (const [grade, areaNames] of Object.entries(gradeAreas)) {
    const gradeRow = await prisma.curriculumGrade.upsert({
      where: { number: Number(grade) },
      update: {},
      create: { number: Number(grade) },
    });
    for (const areaName of areaNames) {
      await prisma.learningArea.upsert({
        where: { gradeId_name: { gradeId: gradeRow.id, name: areaName } },
        update: {},
        create: { gradeId: gradeRow.id, name: areaName },
      });
    }
  }

  for (const [key, subStrandNames] of Object.entries(sampleStrands)) {
    const [gradeNumber, areaName, strandName] = key.split("|");
    const area = await prisma.learningArea.findFirst({
      where: { name: areaName, grade: { number: Number(gradeNumber) } },
    });
    if (!area) continue;
    const strand = await prisma.strand.upsert({
      where: { learningAreaId_name: { learningAreaId: area.id, name: strandName } },
      update: {},
      create: { learningAreaId: area.id, name: strandName },
    });
    for (const subStrandName of subStrandNames) {
      await prisma.subStrand.upsert({
        where: { strandId_name: { strandId: strand.id, name: subStrandName } },
        update: {},
        create: { strandId: strand.id, name: subStrandName },
      });
    }
  }

  const firstSubStrand = await prisma.subStrand.findFirst({
    where: { name: "Safety at Home" },
  });
  if (firstSubStrand) {
    await prisma.resource.upsert({
      where: { id: "sample-safety-at-home-resource" },
      update: {},
      create: {
        id: "sample-safety-at-home-resource",
        title: "Staying Safe at Home",
        content: sampleResourceContent,
        subStrandId: firstSubStrand.id,
        isPublished: true,
      },
    });
  }
}

seedCurriculum()
  .catch((error: unknown) => {
    console.error("Curriculum seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
