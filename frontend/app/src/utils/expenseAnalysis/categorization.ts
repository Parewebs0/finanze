import { TxType } from "@/types/transactions"
import type {
  ExpenseAnalysisConfig,
  ExpenseCategoryId,
} from "@/types/expenseAnalysis"
import { getCategory, isCategoryId } from "./categories"

export interface Categorizer {
  categorize(input: {
    id: string
    concept: string
    amount: number
    txType: TxType
  }): ExpenseCategoryId
}

/** Transfer-group labels never apply to money entering the account. */
export function resolveInflowCategory(
  category: ExpenseCategoryId,
  txType?: TxType,
): ExpenseCategoryId {
  if (txType === TxType.INTEREST) return "interest"
  if (getCategory(category).group === "income") return category
  return "otherIncome"
}

export function createCategorizer(config: ExpenseAnalysisConfig): Categorizer {
  const overrides = new Map<string, ExpenseCategoryId>()
  for (const o of config.overrides ?? []) {
    if (isCategoryId(o.category)) overrides.set(o.txId, o.category)
  }

  return {
    categorize({ id, txType, amount }) {
      const override = overrides.get(id)
      const inflow =
        amount > 0 ||
        txType === TxType.TRANSFER_IN ||
        txType === TxType.INTEREST

      if (inflow) {
        return resolveInflowCategory(override ?? "otherIncome", txType)
      }

      if (override) return override
      if (txType === TxType.FEE) return "fees"
      return "uncategorized"
    },
  }
}
