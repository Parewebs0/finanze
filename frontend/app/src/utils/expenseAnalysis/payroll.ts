import type { AnalysisTx, ExpenseCategoryId } from "@/types/expenseAnalysis"
import { parseIsoDate, toIsoDate } from "./dates"

/** Companies pay salary (and the user often sweeps savings) on the last days of the month. */
export const EARLY_PAYROLL_DAYS = 5

/** How many days after payroll a MyInvestor / savings transfer still belongs to that paycheck. */
const SWEEP_AFTER_PAYROLL_DAYS = 3

const SALARY_HINT =
  /n[oó]mina|abono\s*nomina|payroll|salary|salario|paga\s*extra|finiquito/i

const SAVINGS_DESTINATION_HINT =
  /myinvestor|my investor|indexa|degiro|trade\s*republic|broker|ahorro|fondo|inversi[oó]n/i

const TRANSFER_HINT =
  /transfer|traspaso|abono en cuenta|orden de pago|myinvestor|indexa|degiro|broker|fondo/i

export function periodDate(tx: Pick<AnalysisTx, "date" | "analysisDate">): string {
  return tx.analysisDate || tx.date
}

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
  if (SAVINGS_DESTINATION_HINT.test(blob)) return true
  if (
    category === "ownTransfer" &&
    SAVINGS_DESTINATION_HINT.test(blob)
  ) {
    return true
  }
  return false
}

function looksLikeTransferOutflow(
  tx: Pick<AnalysisTx, "amount" | "category" | "concept" | "entityName" | "group">,
): boolean {
  if (tx.amount >= 0) return false
  if (tx.group === "transfer") return true
  if (tx.category === "ownTransfer" || tx.category === "savingsInvestment") {
    return true
  }
  return TRANSFER_HINT.test(`${tx.concept} ${tx.entityName}`)
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

function daysBetween(from: string, to: string): number {
  const a = parseIsoDate(from).getTime()
  const b = parseIsoDate(to).getTime()
  return Math.round((b - a) / 86_400_000)
}

/**
 * Salary booked on the last days of a month counts as the 1st of the next
 * month. Transfers are shifted in `applyMonthShifts` when they follow that
 * paycheck (MyInvestor / savings sweep).
 */
export function analysisDateFor(
  date: string,
  category: ExpenseCategoryId | string | undefined,
  concept?: string,
): string {
  if (looksLikeSalary(category, concept) && isLastDaysOfMonth(date)) {
    return firstOfNextMonth(date)
  }
  return date
}

/**
 * After salary is shifted, move the savings sweep that follows it into the
 * same analysis month. A generic "TRANSFERENCIA" right after payroll to
 * MyInvestor has no merchant name — proximity to the paycheck is the signal.
 */
export function applyMonthShifts(txs: AnalysisTx[]): AnalysisTx[] {
  const dated = txs.map(tx => ({
    ...tx,
    analysisDate: analysisDateFor(tx.date, tx.category, tx.concept),
  }))

  const payrolls = dated.filter(tx =>
    looksLikeSalary(tx.category, tx.concept),
  )

  return dated.map(tx => {
    if (!looksLikeTransferOutflow(tx)) return tx
    const linked = payrolls.find(salary => {
      const delta = daysBetween(salary.date, tx.date)
      return delta >= 0 && delta <= SWEEP_AFTER_PAYROLL_DAYS
    })
    if (!linked) {
      if (
        looksLikePayrollSweep(tx.category, tx.concept, tx.entityName) &&
        isLastDaysOfMonth(tx.date)
      ) {
        return { ...tx, analysisDate: firstOfNextMonth(tx.date) }
      }
      return tx
    }
    if (!isLastDaysOfMonth(linked.date) && !isLastDaysOfMonth(tx.date)) {
      return tx
    }
    const target = looksLikeSalary(linked.category, linked.concept)
      ? analysisDateFor(linked.date, linked.category, linked.concept)
      : firstOfNextMonth(linked.date)
    return { ...tx, analysisDate: target }
  })
}
