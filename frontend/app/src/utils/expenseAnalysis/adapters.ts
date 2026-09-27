import type { AccountTx, BaseTx } from "@/types/transactions"
import { TxType } from "@/types/transactions"
import type { ExchangeRates } from "@/types"
import type { AnalysisTx } from "@/types/expenseAnalysis"
import { convertCurrency } from "@/utils/financialDataUtils"
import type { Categorizer } from "./categorization"
import { getCategory } from "./categories"
import { analysisDateFor } from "./payroll"

/**
 * Finanze → analysis adapter.
 *
 * Finanze stores account transaction amounts as absolute values and encodes
 * the direction in the TxType, whereas Ledger's model (and every calculation
 * here) uses signed amounts (+ income / - outflow).
 */
const INFLOW_TYPES = new Set<TxType>([
  TxType.TRANSFER_IN,
  TxType.INTEREST,
  TxType.DIVIDEND,
  TxType.SELL,
  TxType.REPAYMENT,
  TxType.RIGHT_SELL,
  TxType.SWITCH_TO,
  TxType.SWAP_TO,
])

export function signedAmount(tx: Pick<BaseTx, "amount" | "type">): number {
  const amount = Math.abs(Number(tx.amount) || 0)
  return INFLOW_TYPES.has(tx.type) ? amount : -amount
}

/** Finanze returns ISO datetimes; the analysis works with local calendar days. */
export function txDay(date: string): string {
  return date.slice(0, 10)
}

export interface AdapterOptions {
  targetCurrency: string
  exchangeRates: ExchangeRates | null
  categorizer: Categorizer
}

export function toAnalysisTx(
  tx: AccountTx,
  { targetCurrency, exchangeRates, categorizer }: AdapterOptions,
): AnalysisTx {
  const original = signedAmount(tx)
  const currency = (tx.currency || targetCurrency).toUpperCase()
  const amount =
    currency === targetCurrency.toUpperCase()
      ? original
      : convertCurrency(original, currency, targetCurrency, exchangeRates)
  const rounded = Math.round(amount * 100) / 100
  const concept = tx.name ?? ""
  const category = categorizer.categorize({
    id: tx.id,
    concept,
    amount: rounded,
    txType: tx.type,
  })
  const date = txDay(tx.date)
  return {
    id: tx.id,
    ref: tx.ref,
    date,
    analysisDate: analysisDateFor(date, category, concept),
    amount: rounded,
    originalAmount: original,
    currency,
    concept,
    entityId: tx.entity?.id ?? "",
    entityName: tx.entity?.name ?? "",
    txType: tx.type,
    category,
    group: getCategory(category).group,
  }
}

export function toAnalysisTxs(
  txs: AccountTx[],
  options: AdapterOptions,
): AnalysisTx[] {
  return txs
    .map(tx => toAnalysisTx(tx, options))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}
