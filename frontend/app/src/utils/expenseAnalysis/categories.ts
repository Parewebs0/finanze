import type {
  CategoryGroup,
  ExpenseCategory,
  ExpenseCategoryId,
} from "@/types/expenseAnalysis"

/**
 * Category catalogue ported from Ledger's seed (db/index.ts), with stable ids
 * instead of Spanish names so they can be translated. Two Finanze-specific
 * categories were added for transaction types Ledger never saw: `interest`
 * (TxType.INTEREST) and `fees` (TxType.FEE).
 */
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "salary", group: "income", color: "#22c55e" },
  { id: "otherIncome", group: "income", color: "#16a34a" },
  { id: "bizumReceived", group: "income", color: "#22d3ee" },
  { id: "interest", group: "income", color: "#34d399" },
  { id: "housing", group: "expense", color: "#6366f1", need: true },
  { id: "utilities", group: "expense", color: "#0ea5e9", need: true },
  { id: "groceries", group: "expense", color: "#84cc16", need: true },
  { id: "restaurants", group: "expense", color: "#f59e0b" },
  { id: "transport", group: "expense", color: "#06b6d4", need: true },
  { id: "subscriptions", group: "expense", color: "#a855f7" },
  { id: "leisure", group: "expense", color: "#ec4899" },
  { id: "health", group: "expense", color: "#ef4444", need: true },
  { id: "shopping", group: "expense", color: "#f97316" },
  { id: "familyFriends", group: "expense", color: "#14b8a6" },
  { id: "sports", group: "expense", color: "#10b981" },
  { id: "travel", group: "expense", color: "#38bdf8" },
  { id: "fees", group: "expense", color: "#94a3b8" },
  { id: "uncategorized", group: "expense", color: "#9ca3af" },
  { id: "ownTransfer", group: "expense", color: "#64748b" },
  { id: "savingsInvestment", group: "expense", color: "#8b5cf6" },
]

const BY_ID = new Map(EXPENSE_CATEGORIES.map(c => [c.id, c]))

export function getCategory(id: ExpenseCategoryId): ExpenseCategory {
  return BY_ID.get(id) ?? BY_ID.get("uncategorized")!
}

export function isCategoryId(value: unknown): value is ExpenseCategoryId {
  return typeof value === "string" && BY_ID.has(value as ExpenseCategoryId)
}

export function categoriesByGroup(group: CategoryGroup): ExpenseCategory[] {
  return EXPENSE_CATEGORIES.filter(c => c.group === group)
}

/** 50/30/20 "needs" set (Ledger: Vivienda, Suministros, Supermercado, Transporte, Salud). */
export const NEEDS_CATEGORIES = new Set<ExpenseCategoryId>(
  EXPENSE_CATEGORIES.filter(c => c.need).map(c => c.id),
)
