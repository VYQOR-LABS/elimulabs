import type { ActivityType, DocumentType } from "@prisma/client";

export const PRICES = {
  RESOURCE_VIEW: 5,
  RESOURCE_PDF: 10,
  RESOURCE_DOCX: 10,
  SCHEME_OF_WORK: 20,
  LESSON_PLAN: 20,
  RECORDS_OF_WORK: 20,
  EXAM: 15,
} as const satisfies Partial<Record<ActivityType | DocumentType, number>>;

export function formatPrice(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}
