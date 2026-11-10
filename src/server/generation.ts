import {
  ActivityStatus,
  ActivityType,
  DocumentType,
  TransactionStatus,
  WalletDirection,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  generateDocument,
  generateExam,
  validateExamRequirements,
  type GeneratedDocument,
  type GeneratedExam,
} from "./ai";
import type { GenerationInput } from "./generation-input";
import { resolveGenerationInput } from "./generation-input";
import { PRICES } from "./pricing";
import { validateTeachingSchedule } from "./document-validation";

const typeMap = {
  SCHEME_OF_WORK: { document: DocumentType.SCHEME_OF_WORK, activity: ActivityType.SCHEME_OF_WORK, price: PRICES.SCHEME_OF_WORK },
  LESSON_PLAN: { document: DocumentType.LESSON_PLAN, activity: ActivityType.LESSON_PLAN, price: PRICES.LESSON_PLAN },
  RECORDS_OF_WORK: { document: DocumentType.RECORDS_OF_WORK, activity: ActivityType.RECORDS_OF_WORK, price: PRICES.RECORDS_OF_WORK },
  EXAM: { document: DocumentType.EXAM, activity: ActivityType.EXAM, price: PRICES.EXAM },
} as const;

function documentTitle(document: GeneratedDocument | GeneratedExam): string {
  return document.title;
}

function serialize(document: GeneratedDocument | GeneratedExam): string {
  return JSON.stringify(document);
}

export async function generateAndCharge(
  userId: string,
  input: GenerationInput,
  idempotencyKey: string,
): Promise<{ document: unknown; balance: number; alreadyCompleted: boolean }> {
  const pricing = typeMap[input.type];
  const prior = await prisma.generatedDocument.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
  });
  if (prior) {
    const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });
    return { document: { id: prior.id, title: prior.title, content: prior.content, markingScheme: prior.markingScheme }, balance: wallet?.balance ?? 0, alreadyCompleted: true };
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });
  if (!wallet) throw new Error("Wallet account was not found.");
  if (wallet.balance < pricing.price) throw new Error(`Insufficient balance. This service costs KSh ${pricing.price}.`);

  const resolved = await resolveGenerationInput(input);
  const context = { ...input, grade: resolved.area.grade, learningArea: resolved.area.name, curriculum: resolved.curriculum };
  let generated: GeneratedDocument | GeneratedExam;
  let markingScheme: string | null = null;
  if (input.type === "EXAM") {
    if (
      input.mcqMarks % input.mcqCount !== 0 ||
      input.structuredMarks % input.structuredCount !== 0 ||
      input.mcqMarks + input.structuredMarks !== input.requiredTotal
    ) {
      throw new Error("Question counts and section marks must divide evenly and match the required total.");
    }
    const examInput = {
      ...context,
      questionSections: [
        { kind: "multiple-choice", count: input.mcqCount, marksEach: input.mcqMarks / input.mcqCount },
        { kind: "structured", count: input.structuredCount, marksEach: input.structuredMarks / input.structuredCount },
      ],
      requiredTotal: input.requiredTotal,
    };
    const exam = await generateExam(examInput);
    validateExamRequirements(exam, {
      multipleChoiceCount: input.mcqCount,
      multipleChoiceMarksEach: input.mcqMarks / input.mcqCount,
      structuredCount: input.structuredCount,
      structuredMarksEach: input.structuredMarks / input.structuredCount,
      totalMarks: input.requiredTotal,
    });
    generated = exam;
    markingScheme = JSON.stringify(exam.markingScheme);
  } else {
    const document = await generateDocument({
      ...context,
      ...(input.type === "SCHEME_OF_WORK" && {
        teachingWeeks: Array.from({ length: input.weeks }, (_, i) => i + 1).filter((week) => week !== input.halfTermWeek),
        scheduledLessonCount:
          (input.weeks - (input.halfTermWeek ? 1 : 0)) * input.lessonsPerWeek,
      }),
    });
    if (input.type === "SCHEME_OF_WORK") {
      validateTeachingSchedule(document.sections, input.weeks, input.halfTermWeek);
    }
    generated = document;
  }

  const result = await prisma.$transaction(async (tx) => {
    const debit = await tx.wallet.updateMany({
      where: { userId, balance: { gte: pricing.price } },
      data: { balance: { decrement: pricing.price } },
    });
    if (!debit.count) throw new Error(`Insufficient balance. This service costs KSh ${pricing.price}.`);
    const saved = await tx.generatedDocument.create({
      data: {
        userId,
        type: pricing.document,
        title: documentTitle(generated),
        input: input as unknown as Prisma.InputJsonValue,
        content: serialize(generated),
        markingScheme,
        idempotencyKey,
      },
    });
    await tx.walletTransaction.create({
      data: {
        userId,
        direction: WalletDirection.DEBIT,
        amount: pricing.price,
        status: TransactionStatus.COMPLETED,
        description: documentTitle(generated),
        idempotencyKey,
        completedAt: new Date(),
      },
    });
    await tx.activityHistory.create({
      data: {
        userId,
        type: pricing.activity,
        title: documentTitle(generated),
        detail: `${resolved.area.name} · Grade ${resolved.area.grade}`,
        amount: -pricing.price,
        status: ActivityStatus.COMPLETED,
        referenceId: saved.id,
      },
    });
    const updatedWallet = await tx.wallet.findUniqueOrThrow({
      where: { userId },
      select: { balance: true },
    });
    return { saved, balance: updatedWallet.balance };
  });

  return {
    document: {
      id: result.saved.id,
      title: result.saved.title,
      content: result.saved.content,
      markingScheme: result.saved.markingScheme,
    },
    balance: result.balance,
    alreadyCompleted: false,
  };
}
