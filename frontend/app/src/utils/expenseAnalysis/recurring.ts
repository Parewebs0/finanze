import type {
  AnalysisTx,
  ExpenseCategoryId,
  RecurringExpense,
  RecurringResult,
} from "@/types/expenseAnalysis"
import { toIsoDate } from "./dates"
import { periodDate } from "./payroll"
import { normalizeConcept } from "./calculations"

const round2 = (n: number) => Math.round(n * 100) / 100 || 0

/** Recurring merchants; category follows the latest movement. */
export function detectRecurring(
  txs: AnalysisTx[],
  months = 6,
  now = new Date(),
): RecurringResult {
  const since = new Date(now)
  since.setMonth(since.getMonth() - Math.min(24, months))
  const sinceIso = toIsoDate(since)

  const groups = new Map<
    string,
    {
      amounts: number[]
      months: Set<string>
      category: ExpenseCategoryId
      example: string
      latest: string
    }
  >()
  for (const tx of txs) {
    if (tx.amount >= 0 || periodDate(tx) < sinceIso) continue
    const key = normalizeConcept(tx.concept)
    if (key.length < 4) continue
    const day = periodDate(tx)
    const g = groups.get(key) ?? {
      amounts: [],
      months: new Set<string>(),
      category: tx.category,
      example: tx.concept,
      latest: day,
    }
    g.amounts.push(-tx.amount)
    g.months.add(day.slice(0, 7))
    if (day >= g.latest) {
      g.category = tx.category
      g.example = tx.concept
      g.latest = day
    }
    groups.set(key, g)
  }

  const items: RecurringExpense[] = []
  for (const g of groups.values()) {
    if (g.months.size < 3 && !(g.months.size >= 2 && g.amounts.length >= 2)) {
      continue
    }
    const avg = g.amounts.reduce((s, v) => s + v, 0) / g.amounts.length
    const maxDev = Math.max(...g.amounts.map(v => Math.abs(v - avg) / avg))
    if (maxDev > 0.15) continue
    items.push({
      concept: g.example,
      category: g.category,
      avgAmount: round2(avg),
      monthsSeen: g.months.size,
      times: g.amounts.length,
    })
  }
  items.sort((a, b) => b.avgAmount - a.avgAmount)
  const monthlyTotal = round2(items.reduce((s, r) => s + r.avgAmount, 0))
  return { items, monthlyTotal }
}
