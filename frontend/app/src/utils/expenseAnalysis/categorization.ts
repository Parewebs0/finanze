import { TxType } from "@/types/transactions"
import type {
  ExpenseAnalysisConfig,
  ExpenseCategoryId,
} from "@/types/expenseAnalysis"
import { isCategoryId } from "./categories"

/**
 * Frontend categorization fallback for the analysis page.
 *
 * The "smart" categorizer is Jev (TypeSafe), reached via the
 * `Categorize with Jev` card. Once Jev returns a category for a tx,
 * it is stored as an override in `config.overrides` (per-tx-id) and
 * applied here on every render.
 *
 * The local categorizer is intentionally tiny. It does NOT use seed
 * rules (no regex, no keyword lists). All it does:
 *   1. If Jev has already classified this tx (override), use that.
 *   2. Otherwise classify by bank tx type and direction:
 *      - INTEREST                -> interest (income)
 *      - FEE                     -> fees        (expense)
 *      - TRANSFER_IN, amount > 0 -> otherIncome (income)
 *      - any other inflow        -> otherIncome
 *      - any other outflow       -> uncategorized
 *
 * Everything else is Jev's job. If something doesn't have a category
 * yet, it shows as "uncategorized" in the UI and the user can press
 * "Re-categorize" to send it to Jev.
 */

export interface Categorizer {
  categorize(input: {
    id: string
    concept: string
    amount: number
    txType: TxType
  }): ExpenseCategoryId
}

export function createCategorizer(config: ExpenseAnalysisConfig): Categorizer {
  const overrides = new Map<string, ExpenseCategoryId>()
  for (const o of config.overrides ?? []) {
    if (isCategoryId(o.category)) overrides.set(o.txId, o.category)
  }

  return {
    categorize({ id, txType, amount }) {
      // 1) Jev override (per-tx-id) wins.
      const override = overrides.get(id)
      if (override) return override

      // 2) Trivial type/direction fallback. No keyword rules.
      if (txType === TxType.INTEREST) return "interest"
      if (txType === TxType.FEE) return "fees"
      if (txType === TxType.TRANSFER_IN && amount > 0) return "otherIncome"

      // 3) Unknown inflow/outflow -> uncategorized so Jev can take a look.
      return amount >= 0 ? "otherIncome" : "uncategorized"
    },
  }
}

