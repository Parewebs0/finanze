import type { ExpenseCategoryId } from "@/types/expenseAnalysis"
import { parseIsoDate, toIsoDate } from "./dates"

/** Companies pay salary (and the user often sweeps savings) on the last days of the month. */
export const EARLY_PAYROLL_DAYS = 5

const SALARY_HINT =
  /n[oó]mina|abono\s*nomina|payroll|salary|salario|paga\s*extra|finiquito/i

const SAVINGS_SWEEP_HINT =
  /myinvestor|my investor|indexa|degiro|trade\s*republic|broker|ahorro|fondo|inversi[oó]n|traspaso/i

export function looksLikeSalary(
  category: ExpenseCategoryId | string | undefined,
  concept?: string,
): boolean {
  if (category === "salary") return true
  return Boolean(concept && SALARY_HINT.test(concept))
}

export function looksLikePayrollSweep(
  category: ExpenseCategoryId | string | undefined,
  concept?: string,
  entityName?: string,
): boolean {
  if (category === "savingsInvestment") return true
  const blob = `${concept ?? ""} ${entityName ?? ""}`
  if (SAVINGS_SWEEP_HINT.test(blob)) return true
  if (category === "ownTransfer" && /myinvestor|indexa|broker|fondo/i.test(blob)) {
    return true
  }
  return false
}

function isLastDaysOfMonth(date: string): boolean {
  const booked = parseIsoDate(date)
  const lastDay = new Date(
    booked.getFullYear(),
    booked.getMonth() + 1,
    0,
  ).getDate()
  return booked.getDate() > lastDay - EARLY_PAYROLL_DAYS
}

function firstOfNextMonth(date: string): string {
  const booked = parseIsoDate(date)
  return toIsoDate(new Date(booked.getFullYear(), booked.getMonth() + 1, 1))
}

/**
 * Salary and the savings sweep that follows it, when booked on the last days
 * of a month, count as the 1st of the next month.
 */
export function analysisDateFor(
  date: string,
  category: ExpenseCategoryId | string | undefined,
  concept?: string,
  entityName?: string,
): string {
  const shift =
    looksLikeSalary(category, concept) ||
    looksLikePayrollSweep(category, concept, entityName)
  if (!shift || !isLastDaysOfMonth(date)) return date
  return firstOfNextMonth(date)
}
