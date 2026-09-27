import { PiggyBank, X } from "lucide-react"
import { useI18n } from "@/i18n"
import { Sensitive } from "@/components/ui/Sensitive"
import { Button } from "@/components/ui/Button"
import { useModalBackHandler } from "@/hooks/useModalBackHandler"
import type { ExpenseAnalysisState } from "@/hooks/useExpenseAnalysis"
import type { AnalysisTx } from "@/types/expenseAnalysis"
import { useCategoryLabel } from "./shared"

function TxLines({
  txs,
  money,
}: {
  txs: AnalysisTx[]
  money: ExpenseAnalysisState["money"]
}) {
  if (txs.length === 0) {
    return null
  }
  return (
    <ul className="mt-1 space-y-1">
      {txs.map(tx => (
        <li
          key={tx.id}
          className="flex items-baseline justify-between gap-3 text-sm"
        >
          <span className="min-w-0 truncate text-muted-foreground">
            {money.formatDay(tx.date)} · {tx.concept}
          </span>
          <Sensitive className="shrink-0 tabular-nums">
            {money.format(Math.abs(tx.amount))}
          </Sensitive>
        </li>
      ))}
    </ul>
  )
}

export function SavingsBreakdownBody({
  state,
}: {
  state: ExpenseAnalysisState
}) {
  const { t } = useI18n()
  const label = useCategoryLabel()
  const { money, savings } = state
  const copy = t.expenseAnalysis.savingsAndInvesting
  const rows = [
    { key: "income", value: savings.income, txs: savings.incomeTxs },
    { key: "expenses", value: savings.expenses, txs: savings.expenseTxs },
    {
      key: "ownTransfer",
      value: savings.ownTransfer,
      txs: savings.ownTransferTxs,
    },
    { key: "invested", value: savings.invested, txs: savings.investedTxs },
    { key: "liquid", value: savings.liquid, txs: [] as AnalysisTx[] },
  ] as const

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{copy.formula}</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">{copy.rate}</p>
          <p className="text-lg font-semibold tabular-nums">
            {money.formatPct(savings.rate, 1)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{copy.allocated}</p>
          <p className="text-lg font-semibold tabular-nums">
            <Sensitive>
              {money.format(
                savings.ownTransfer + savings.invested + savings.liquid,
              )}
            </Sensitive>
          </p>
        </div>
      </div>
      {rows.map(row => (
        <div key={row.key} className="border-t pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">
              {row.key === "ownTransfer" || row.key === "invested"
                ? label(
                    row.key === "invested"
                      ? "savingsInvestment"
                      : "ownTransfer",
                  )
                : copy[row.key]}
            </span>
            <Sensitive className="tabular-nums font-semibold">
              {money.format(row.value)}
            </Sensitive>
          </div>
          <TxLines
            txs={row.key === "expenses" ? row.txs.slice(0, 12) : row.txs}
            money={money}
          />
          {row.key === "expenses" && row.txs.length > 12 && (
            <p className="mt-1 text-xs text-muted-foreground">
              +{row.txs.length - 12}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

export function SavingsBreakdownDialog({
  open,
  onClose,
  state,
}: {
  open: boolean
  onClose: () => void
  state: ExpenseAnalysisState
}) {
  const { t } = useI18n()
  useModalBackHandler(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-background sm:rounded-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-violet-500" />
            <h2 className="text-base font-semibold">
              {t.expenseAnalysis.savingsAndInvesting.title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-y-auto px-4 py-4">
          <SavingsBreakdownBody state={state} />
        </div>
      </div>
    </div>
  )
}
