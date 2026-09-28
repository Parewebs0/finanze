import type {
  AnalysisTx,
  DateRange,
  ExpenseCategoryId,
  RangeAggregates,
  Rule503020Result,
} from "@/types/expenseAnalysis"
import { NEEDS_CATEGORIES } from "./categories"
import { rangeAggregates as rawRangeAggregates } from "./calculations"

const SAVING_CATS = new Set(["savingsInvestment"])

const round2 = (n: number) => Math.round(n * 100) / 100 || 0

export function rangeAggregates(
  txs: AnalysisTx[],
  range: DateRange,
): RangeAggregates {
  const agg = rawRangeAggregates(txs, range)
  return { ...agg, savingsInvestment: investmentTotal(agg) }
}

export function investmentTotal(agg: RangeAggregates): number {
  return round2(
    -agg.byCategory
      .filter(c => c.category === "savingsInvestment")
      .reduce((s, c) => s + c.total, 0),
  )
}

/** Solo inversión / ingresos */
export function savingsRate(agg: RangeAggregates): number {
  const invested = investmentTotal(agg)
  return agg.income > 0 ? (invested / agg.income) * 100 : 0
}

export type RuleSlice = "needs" | "wants" | "savings"

export interface RuleSliceItem {
  category: ExpenseCategoryId | "liquid"
  value: number
}

export function rule503020Slices(
  agg: RangeAggregates,
): Record<RuleSlice, RuleSliceItem[]> {
  const needs: RuleSliceItem[] = []
  const wants: RuleSliceItem[] = []
  const savings: RuleSliceItem[] = []
  for (const c of agg.byCategory) {
    if (c.group !== "expense") continue
    const value = round2(-c.total)
    if (value <= 0) continue
    const item = { category: c.category, value }
    if (SAVING_CATS.has(c.category)) savings.push(item)
    else if (NEEDS_CATEGORIES.has(c.category)) needs.push(item)
    else wants.push(item)
  }
  const sort = (a: RuleSliceItem, b: RuleSliceItem) => b.value - a.value
  return {
    needs: needs.sort(sort),
    wants: wants.sort(sort),
    savings: savings.sort(sort),
  }
}

export function rule503020(agg: RangeAggregates): Rule503020Result {
  let needs = 0
  let wants = 0
  let allocated = 0
  for (const c of agg.byCategory) {
    if (c.group !== "expense") continue
    const spent = -c.total
    if (SAVING_CATS.has(c.category)) allocated += spent
    else if (NEEDS_CATEGORIES.has(c.category)) needs += spent
    else wants += spent
  }
  const savings = allocated
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
