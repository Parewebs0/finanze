import type {
  AnalysisTx,
  DateRange,
  SavingsBreakdown,
} from "@/types/expenseAnalysis"
import { isInRange } from "./dates"
import { periodDate } from "./payroll"

const round2 = (n: number) => Math.round(n * 100) / 100 || 0

/** Income − expenses − transfers. Transfers are not added twice. */
export function savingsBreakdown(
  txs: AnalysisTx[],
  range: DateRange,
): SavingsBreakdown {
  const scoped = txs.filter(tx => isInRange(periodDate(tx), range))
  const incomeTxs = scoped.filter(tx => tx.amount > 0)
  const expenseTxs = scoped.filter(
    tx => tx.amount < 0 && tx.group === "expense",
  )
  const ownTransferTxs = scoped.filter(
    tx => tx.amount < 0 && tx.category === "ownTransfer",
  )
  const investedTxs = scoped.filter(
    tx => tx.amount < 0 && tx.category === "savingsInvestment",
  )
  const income = round2(incomeTxs.reduce((s, tx) => s + tx.amount, 0))
  const expenses = round2(expenseTxs.reduce((s, tx) => s + -tx.amount, 0))
  const ownTransfer = round2(
    ownTransferTxs.reduce((s, tx) => s + -tx.amount, 0),
  )
  const invested = round2(investedTxs.reduce((s, tx) => s + -tx.amount, 0))
  const liquid = round2(income - expenses - ownTransfer - invested)
  return {
    income,
    expenses,
    liquid,
    ownTransfer,
    invested,
    rate: income > 0 ? ((liquid + ownTransfer + invested) / income) * 100 : 0,
    incomeTxs,
    expenseTxs,
    ownTransferTxs,
    investedTxs,
  }
}
