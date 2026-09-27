import type { ExpenseCategoryId } from "@/types/expenseAnalysis"
import { parseIsoDate, toIsoDate } from "./dates"

/** Companies sometimes pay salary on the last business days of the previous month. */
export const EARLY_PAYROLL_DAYS = 5

const SALARY_HINT =
  /n[oó]mina|abono\s*nomina|payroll|salary|salario|paga\s*extra|finiquito/i

export function looksLikeSalary(
  category: ExpenseCategoryId | string | undefined,
  concept?: string,
): boolean {
  if (category === "salary") return true
  return Boolean(concept && SALARY_HINT.test(concept))
}

/**
 * Salary booked on the last days of a month counts as the 1st of the next
 * month so August does not show two nóminas.
 */
export function analysisDateFor(
  date: string,
  category: ExpenseCategoryId | string | undefined,
  concept?: string,
): string {
  if (!looksLikeSalary(category, concept)) return date
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
