import assert from "node:assert/strict";
import test from "node:test";
import { PRICES } from "../src/server/pricing";
import { normalizePhone } from "../src/server/mpesa";
import { hashPassword, verifyPassword } from "../src/server/password";
import { validateTeachingSchedule } from "../src/server/document-validation";
import { validateExam, validateExamRequirements } from "../src/server/ai";

test("enforces the published service prices", () => {
  assert.deepEqual(PRICES, {
    RESOURCE_VIEW: 5,
    RESOURCE_PDF: 10,
    RESOURCE_DOCX: 10,
    SCHEME_OF_WORK: 20,
    LESSON_PLAN: 20,
    RECORDS_OF_WORK: 20,
    EXAM: 15,
  });
});

test("normalizes and rejects Kenyan phone numbers", () => {
  assert.equal(normalizePhone("0712345678"), "254712345678");
  assert.equal(normalizePhone("+254 712 345 678"), "254712345678");
  assert.equal(normalizePhone("12345"), null);
});

test("password storage uses salted hashes and verifies the password", async () => {
  const stored = await hashPassword("strong-test-password");
  assert.notEqual(stored, "strong-test-password");
  assert.equal(await verifyPassword("strong-test-password", stored), true);
  assert.equal(await verifyPassword("wrong-password", stored), false);
});

test("teaching schedule excludes the half-term week", () => {
  const schedule = [1, 2, 3, 4, 5, 6, 8, 9].map((week) => ({ heading: `Week ${week}` }));
  assert.doesNotThrow(() => validateTeachingSchedule(schedule, 9, 7));
  assert.throws(() => validateTeachingSchedule([...schedule, { heading: "Week 7" }], 9, 7));
});

test("examination marking scheme must match every generated question", () => {
  const exam = validateExam({
    title: "Test exam",
    questions: [
      { number: 1, kind: "multiple-choice", text: "Choose an answer.", marks: 1, options: ["A", "B", "C", "D"] },
      { number: 2, kind: "structured", text: "Explain your answer.", marks: 2 },
    ],
    markingScheme: [
      { questionNumber: 1, answer: "A", marks: 1 },
      { questionNumber: 2, answer: "Explanation", marks: 2 },
    ],
  });
  assert.doesNotThrow(() => validateExamRequirements(exam, {
    multipleChoiceCount: 1,
    multipleChoiceMarksEach: 1,
    structuredCount: 1,
    structuredMarksEach: 2,
    totalMarks: 3,
  }));
  assert.throws(() => validateExamRequirements(exam, {
    multipleChoiceCount: 2,
    multipleChoiceMarksEach: 1,
    structuredCount: 1,
    structuredMarksEach: 2,
    totalMarks: 4,
  }));
});
