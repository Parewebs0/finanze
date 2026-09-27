import { TxType } from "./transactions"

/**
 * Expense analysis (ported from Ledger's "Análisis" section).
 *
 * Categories are Finanze-side concepts: Finanze transactions don't carry a
 * category, so they're assigned client-side by the categorization engine
 * (seeded rules + user rules + per-transaction overrides stored in settings).
 */

export type CategoryGroup = "income" | "expense" | "transfer"

export type ExpenseCategoryId =
  | "salary"
  | "otherIncome"
  | "bizumReceived"
  | "interest"
  | "housing"
  | "utilities"
  | "groceries"
  | "restaurants"
  | "transport"
  | "subscriptions"
  | "leisure"
  | "health"
  | "shopping"
  | "familyFriends"
  | "sports"
  | "travel"
  | "fees"
  | "uncategorized"
  | "ownTransfer"
  | "savingsInvestment"

export interface ExpenseCategory {
  id: ExpenseCategoryId
  group: CategoryGroup
  color: string
  /** Counts as "needs" in the 50/30/20 rule */
  need?: boolean
}

/** Normalised transaction used by every analysis calculation. */
export interface AnalysisTx {
  id: string
  ref: string
  /** Bank calendar day, yyyy-MM-dd */
  date: string
  /**
   * Day used for totals and charts. Salary paid in the last 4 days of a
   * month is shifted to the 1st of the next month (early payroll).
   */
  analysisDate: string
  /** Signed amount in the display currency (+ income, - outflow) */
  amount: number
  originalAmount: number
  currency: string
  concept: string
  entityId: string
  entityName: string
  txType: TxType
  category: ExpenseCategoryId
  group: CategoryGroup
  /** Marked by the user so it is omitted from totals and charts. */
  excluded?: boolean
}

export interface DateRange {
  from: string
  to: string
}

export type RangePreset =
  | "month"
  | "prevMonth"
  | "3m"
  | "6m"
  | "year"
  | "all"
  | "custom"

export interface PresetRange extends DateRange {
  preset: RangePreset
}

export interface CategoryAggregate {
  category: ExpenseCategoryId
  group: CategoryGroup
  color: string
  /** Signed sum */
  total: number
  count: number
}

export interface RangeAggregates {
  income: number
  expenses: number
  /** income - expenses */
  savings: number
  /** Money moved to own accounts / investments (transfer group outflows) */
  savingsInvestment: number
  avgDailySpend: number
  byCategory: CategoryAggregate[]
}

export interface DailyPoint {
  date: string
  income: number
  expenses: number
}

export interface HeatmapPoint {
  date: string
  spent: number
}

export interface RecurringExpense {
  concept: string
  category: ExpenseCategoryId
  avgAmount: number
  monthsSeen: number
  times: number
}

export interface RecurringResult {
  items: RecurringExpense[]
  monthlyTotal: number
}

export interface RuleBucket {
  value: number
  pct: number
  target: number
}

export interface Rule503020Result {
  income: number
  needs: RuleBucket
  wants: RuleBucket
  savings: RuleBucket
}

export interface BudgetStatus {
  category: ExpenseCategoryId
  color: string
  /** Monthly budget as configured */
  monthlyBudget: number
  /** Budget for the selected period (monthly × months covered) */
  budget: number
  spent: number
  pct: number
  remaining: number
}

export interface MonthlyEvolutionPoint {
  month: string
  income: number
  expenses: number
}

export interface MerchantTotal {
  concept: string
  total: number
  count: number
}

export interface CategoryRanking {
  category: ExpenseCategoryId
  color: string
  value: number
  count: number
  pct: number
  /** % vs previous period, null when there's no previous data */
  delta: number | null
}

// ---- Persisted configuration (Settings.expenseAnalysis) ----

export interface ExpenseCategoryRule {
  pattern: string
  category: ExpenseCategoryId
  /** Signed exact amount (e.g. -50). When set the rule only matches it. */
  amount?: number | null
}

export interface ExpenseBudget {
  category: ExpenseCategoryId
  amount: number
}

export interface ExpenseCategoryOverride {
  txId: string
  category: ExpenseCategoryId
}

export interface ExpenseAnalysisConfig {
  rules: ExpenseCategoryRule[]
  budgets: ExpenseBudget[]
  overrides: ExpenseCategoryOverride[]
  /** Transaction ids omitted from totals and charts. */
  excluded: string[]
}
