import type { ExpenseCategoryId } from "@/types/expenseAnalysis"
import { parseIsoDate, toIsoDate } from "./dates"

/** Companies sometimes pay salary 1–4 days before month start. */
export const EARLY_PAYROLL_DAYS = 4

/**
 * Salary booked on the last 4 calendar days of a month counts as the next
 * month's income. Everything else keeps the bank date.
 */
export function analysisDateFor(
  date: string,
  category: ExpenseCategoryId,
): string {
  if (category !== "salary") return date
  const booked = parseIsoDate(date)
  const lastDay = new Date(
    booked.getFullYear(),
    booked.getMonth() + 1,
    0,
  ).getDate()
  if (booked.getDate() > lastDay - EARLY_PAYROLL_DAYS) {
    return toIsoDate(new Date(booked.getFullYear(), booked.getMonth() + 1, 1))
  }
  return date
}
