export function validateTeachingSchedule(
  sections: ReadonlyArray<{ heading: string }>,
  weeks: number,
  halfTermWeek: number | null,
): void {
  const generatedWeeks = sections.flatMap((section) => {
    const match = /^week\s+(\d+)\b/i.exec(section.heading.trim());
    return match ? [Number(match[1])] : [];
  });
  const expectedWeeks = Array.from({ length: weeks }, (_, index) => index + 1)
    .filter((week) => week !== halfTermWeek);
  if (
    generatedWeeks.length !== expectedWeeks.length ||
    expectedWeeks.some((week) => !generatedWeeks.includes(week)) ||
    (halfTermWeek !== null && generatedWeeks.includes(halfTermWeek))
  ) {
    throw new Error("Generated schedule did not exclude the selected half-term week. Please try again.");
  }
}
