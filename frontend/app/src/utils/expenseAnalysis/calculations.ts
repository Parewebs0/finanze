import type {
  AnalysisTx,
  BudgetStatus,
  CategoryAggregate,
  CategoryRanking,
  DailyPoint,
  DateRange,
  ExpenseBudget,
  ExpenseCategoryId,
  HeatmapPoint,
  MerchantTotal,
  MonthlyEvolutionPoint,
  RangeAggregates,
  RecurringExpense,
  RecurringResult,
  Rule503020Result,
} from "@/types/expenseAnalysis"
import { NEEDS_CATEGORIES, getCategory, isCategoryId } from "./categories"
import {
  daysInRange,
  eachDay,
  isInRange,
  monthsInRange,
  parseIsoDate,
  toIsoDate,
} from "./dates"
import { periodDate } from "./payroll"

/**
 * Pure analysis calculations, one-to-one ports of Ledger's
 * server/src/routes/stats.ts and budgets.ts SQL queries. Shared by the
 * desktop and mobile views through useExpenseAnalysis.
 */

// `|| 0` avoids rendering "-0,00 €" for empty periods
const round2 = (n: number) => Math.round(n * 100) / 100 || 0

export const pctDelta = (now: number, before: number): number | null =>
  before === 0 ? null : ((now - before) / Math.abs(before)) * 100

export function filterRange(txs: AnalysisTx[], range: DateRange): AnalysisTx[] {
  return txs.filter(tx => isInRange(periodDate(tx), range))
}

/** Ledger rangeAggregates() */
export function rangeAggregates(
  txs: AnalysisTx[],
  range: DateRange,
): RangeAggregates {
  const byCat = new Map<ExpenseCategoryId, CategoryAggregate>()
  let savingsInvestment = 0

  for (const tx of txs) {
    const bucketDate = periodDate(tx)
    if (!isInRange(bucketDate, range)) continue
    if (tx.group === "transfer") {
      if (tx.amount < 0) savingsInvestment += -tx.amount
      continue
    }
    const agg = byCat.get(tx.category) ?? {
      category: tx.category,
      group: tx.group,
      color: getCategory(tx.category).color,
      total: 0,
      count: 0,
    }
    agg.total += tx.amount
    agg.count += 1
    byCat.set(tx.category, agg)
  }

  const byCategory = [...byCat.values()]
    .map(c => ({ ...c, total: round2(c.total) }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const income = byCategory
    .filter(c => c.group === "income")
    .reduce((s, c) => s + c.total, 0)
  const expenses = -byCategory
    .filter(c => c.group === "expense")
    .reduce((s, c) => s + c.total, 0)
  const days = daysInRange(range.from, range.to)

  return {
    income: round2(income),
    expenses: round2(expenses),
    savings: round2(income - expenses),
    savingsInvestment: round2(savingsInvestment),
    avgDailySpend: round2(expenses) / days,
    byCategory,
  }
}

/** Savings rate KPI: (liquid savings + invested) / income, in % */
export function savingsRate(agg: RangeAggregates): number {
  return agg.income > 0
    ? ((agg.savings + agg.savingsInvestment) / agg.income) * 100
    : 0
}

/** Ledger /api/stats/daily — zero filled so the chart line is continuous. */
export function dailyCashflow(
  txs: AnalysisTx[],
  range: DateRange,
  category?: ExpenseCategoryId | null,
): DailyPoint[] {
  const byDay = new Map<string, DailyPoint>()
  for (const tx of txs) {
    const bucketDate = periodDate(tx)
    if (tx.group === "transfer" || !isInRange(bucketDate, range)) continue
    if (category && tx.category !== category) continue
    const p = byDay.get(bucketDate) ?? { date: bucketDate, income: 0, expenses: 0 }
    if (tx.group === "income") p.income += tx.amount
    else p.expenses += -tx.amount
    byDay.set(bucketDate, p)
  }
  return eachDay(range.from, range.to).map(date => {
    const p = byDay.get(date)
    return {
      date,
      income: p ? round2(p.income) : 0,
      expenses: p ? round2(p.expenses) : 0,
    }
  })
}

/** Ledger /api/stats/heatmap — spend per day for a calendar year. */
export function spendingHeatmap(
  txs: AnalysisTx[],
  year: number,
  category?: ExpenseCategoryId | null,
): HeatmapPoint[] {
  const prefix = String(year)
  const byDay = new Map<string, number>()
  for (const tx of txs) {
    if (tx.group !== "expense" || tx.amount >= 0) continue
    const bucketDate = periodDate(tx)
    if (!bucketDate.startsWith(prefix)) continue
    if (category && tx.category !== category) continue
    byDay.set(bucketDate, (byDay.get(bucketDate) ?? 0) + -tx.amount)
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, spent]) => ({ date, spent: round2(spent) }))
}

/** Heatmap grid: weeks (columns) × weekdays Monday-first (rows). */
export function heatmapWeeks(
  data: HeatmapPoint[],
  year: number,
): (HeatmapPoint | null)[][] {
  const map = new Map(data.map(d => [d.date, d.spent]))
  const start = new Date(year, 0, 1)
  const offset = (start.getDay() + 6) % 7
  const weeks: (HeatmapPoint | null)[][] = []
  let week: (HeatmapPoint | null)[] = Array(offset).fill(null)
  const d = new Date(start)
  while (d.getFullYear() === year) {
    const date = toIsoDate(d)
    week.push({ date, spent: map.get(date) ?? 0 })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
    d.setDate(d.getDate() + 1)
  }
  if (week.length) weeks.push(week)
  return weeks
}

/** Month grid (Monday first) used by the mobile calendar heatmap. */
export function monthGrid(
  data: HeatmapPoint[],
  year: number,
  month: number,
): (HeatmapPoint | null)[][] {
  const map = new Map(data.map(d => [d.date, d.spent]))
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const cells: (HeatmapPoint | null)[] = Array(offset).fill(null)
  const d = new Date(first)
  while (d.getMonth() === month) {
    const date = toIsoDate(d)
    cells.push({ date, spent: map.get(date) ?? 0 })
    d.setDate(d.getDate() + 1)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const rows: (HeatmapPoint | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

/** Ledger normConcept(): strips dates, card numbers, fees and digits. */
export function normalizeConcept(concept: string): string {
  return concept
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(
      /\d{4,}|\d{2}\/\d{2}\/\d{2,4}|tarj[^,]*|tarj\.[^,]*|comision[^,]*|[0-9]+/g,
      "",
    )
    .replace(/[^a-zñ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
}

/**
 * Ledger /api/stats/recurring: same merchant in ≥3 distinct months (or ≥2
 * months and ≥2 charges) with a stable amount (max deviation 15%).
 */
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
    }
  >()
  for (const tx of txs) {
    if (tx.amount >= 0 || periodDate(tx) < sinceIso) continue
    const key = normalizeConcept(tx.concept)
    if (key.length < 4) continue
    const g = groups.get(key) ?? {
      amounts: [],
      months: new Set<string>(),
      category: tx.category,
      example: tx.concept,
    }
    g.amounts.push(-tx.amount)
    g.months.add(periodDate(tx).slice(0, 7))
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

/** Ledger /api/stats/503020 */
export function rule503020(agg: RangeAggregates): Rule503020Result {
  let needs = 0
  let wants = 0
  for (const c of agg.byCategory) {
    if (c.group !== "expense") continue
    const spent = -c.total
    if (NEEDS_CATEGORIES.has(c.category)) needs += spent
    else wants += spent
  }
  const savings = agg.savings + agg.savingsInvestment
  const base = agg.income > 0 ? agg.income : needs + wants + savings || 1
  const bucket = (value: number, target: number) => ({
    value: round2(value),
    pct: Math.round((100 * value * 10) / base) / 10,
    target,
  })
  return {
    income: agg.income,
    needs: bucket(needs, 50),
    wants: bucket(wants, 30),
    savings: bucket(savings, 20),
  }
}

/**
 * Ledger /api/budgets/status. Budgets are monthly; for multi-month ranges the
 * budget is multiplied by the number of calendar months covered (Ledger
 * compared the raw monthly amount against any range).
 */
export function budgetStatus(
  txs: AnalysisTx[],
  budgets: ExpenseBudget[],
  range: DateRange,
): BudgetStatus[] {
  const months = monthsInRange(range.from, range.to)
  const spentByCat = new Map<ExpenseCategoryId, number>()
  for (const tx of txs) {
    if (tx.amount >= 0 || !isInRange(periodDate(tx), range)) continue
    spentByCat.set(tx.category, (spentByCat.get(tx.category) ?? 0) + -tx.amount)
  }
  return budgets
    .filter(b => isCategoryId(b.category))
    .map(b => {
      const monthlyBudget = Number(b.amount) || 0
      const budget = monthlyBudget * months
      const spent = round2(spentByCat.get(b.category) ?? 0)
      return {
        category: b.category,
        color: getCategory(b.category).color,
        monthlyBudget,
        budget,
        spent,
        pct: budget > 0 ? Math.round((spent / budget) * 1000) / 10 : 0,
        remaining: round2(budget - spent),
      }
    })
    .sort((a, b) => b.budget - a.budget)
}

/** Ledger /api/stats/evolution (Dashboard): last N calendar months. */
export function monthlyEvolution(
  txs: AnalysisTx[],
  months = 12,
  now = new Date(),
): MonthlyEvolutionPoint[] {
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  const byMonth = new Map(
    keys.map(k => [k, { month: k, income: 0, expenses: 0 }]),
  )
  for (const tx of txs) {
    if (tx.group === "transfer") continue
    const p = byMonth.get(periodDate(tx).slice(0, 7))
    if (!p) continue
    if (tx.group === "income") p.income += tx.amount
    else p.expenses += -tx.amount
  }
  return keys.map(k => {
    const p = byMonth.get(k)!
    return { month: k, income: round2(p.income), expenses: round2(p.expenses) }
  })
}

/** Ledger /api/stats/top-merchants (there: fixed 3 months; here: the range). */
export function topMerchants(
  txs: AnalysisTx[],
  range: DateRange,
  limit = 15,
): MerchantTotal[] {
  const byConcept = new Map<string, MerchantTotal>()
  for (const tx of txs) {
    if (tx.group !== "expense" || tx.amount >= 0) continue
    if (!isInRange(periodDate(tx), range)) continue
    const m = byConcept.get(tx.concept) ?? {
      concept: tx.concept,
      total: 0,
      count: 0,
    }
    m.total += -tx.amount
    m.count += 1
    byConcept.set(tx.concept, m)
  }
  return [...byConcept.values()]
    .map(m => ({ ...m, total: round2(m.total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

/** Donut + ranking data (Analisis.tsx gastosCats/ranking). */
export function categoryRanking(
  current: RangeAggregates,
  previous: RangeAggregates | null,
): CategoryRanking[] {
  return current.byCategory
    .filter(c => c.group === "expense")
    .map(c => {
      const value = Math.abs(c.total)
      const prev = previous?.byCategory.find(p => p.category === c.category)
      return {
        category: c.category,
        color: c.color,
        value,
        count: c.count,
        pct: (value / (current.expenses || 1)) * 100,
        delta: pctDelta(value, Math.abs(prev?.total ?? 0)),
      }
    })
    .filter(c => c.value > 0)
}

/** Earliest day any analysis block needs, so one fetch feeds everything. */
export function requiredWindow(
  range: DateRange,
  previous: DateRange,
  now = new Date(),
): DateRange {
  const today = toIsoDate(now)
  const recurringStart = new Date(now)
  recurringStart.setMonth(recurringStart.getMonth() - 6)
  const evolutionStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const heatmapYear = parseIsoDate(range.to).getFullYear()
  const candidates = [
    previous.from,
    range.from,
    toIsoDate(recurringStart),
    toIsoDate(evolutionStart),
    `${heatmapYear}-01-01`,
  ]
  const from = candidates.reduce((min, d) => (d < min ? d : min))
  const to = [range.to, today, `${heatmapYear}-12-31`].reduce((max, d) =>
    d > max ? d : max,
  )
  return { from, to }
}
