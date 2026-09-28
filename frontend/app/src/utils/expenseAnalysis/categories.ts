import type {
  CategoryGroup,
  ExpenseCategory,
  ExpenseCategoryId,
} from "@/types/expenseAnalysis"

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
  { id: "beauty", group: "expense", color: "#f472b6" },
  { id: "softwareAi", group: "expense", color: "#818cf8" },
  { id: "education", group: "expense", color: "#fbbf24" },
  { id: "pets", group: "expense", color: "#fb923c" },
  { id: "insurance", group: "expense", color: "#0ea5e9", need: true },
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

export const NEEDS_CATEGORIES = new Set<ExpenseCategoryId>(
  EXPENSE_CATEGORIES.filter(c => c.need).map(c => c.id),
)

export const CATEGORY_LABELS: Record<ExpenseCategoryId, string> = {
  salary: "Nómina",
  otherIncome: "Otros ingresos",
  bizumReceived: "Bizum recibido",
  interest: "Intereses",
  housing: "Vivienda",
  utilities: "Suministros",
  groceries: "Supermercado",
  restaurants: "Restaurantes",
  transport: "Transporte",
  subscriptions: "Suscripciones",
  leisure: "Ocio",
  health: "Salud",
  shopping: "Compras",
  familyFriends: "Familia y amigos",
  sports: "Deporte",
  travel: "Viajes",
  beauty: "Belleza",
  softwareAi: "Software e IA",
  education: "Formación",
  pets: "Mascotas",
  insurance: "Seguros",
  fees: "Comisiones",
  uncategorized: "Sin categoría",
  ownTransfer: "Traspaso propio",
  savingsInvestment: "Ahorro e inversión",
}
