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

export function isInflowTx(amount: number, txType?: TxType): boolean {
  return (
    amount > 0 ||
    txType === TxType.TRANSFER_IN ||
    txType === TxType.INTEREST
  )
}

/** Income is never classified. Type maps to a bucket; Jev cannot change it. */
export function incomeCategory(txType?: TxType): ExpenseCategoryId {
  if (txType === TxType.INTEREST) return "interest"
  return "otherIncome"
}

export function createCategorizer(config: ExpenseAnalysisConfig): Categorizer {
  const overrides = new Map<string, ExpenseCategoryId>()
  for (const o of config.overrides ?? []) {
    if (isCategoryId(o.category)) overrides.set(o.txId, o.category)
  }

  return {
    categorize({ id, txType, amount }) {
      if (isInflowTx(amount, txType)) return incomeCategory(txType)

      const override = overrides.get(id)
      if (override && getCategory(override).group !== "income") return override
      if (txType === TxType.FEE) return "fees"
      return "uncategorized"
    },
  }
}
