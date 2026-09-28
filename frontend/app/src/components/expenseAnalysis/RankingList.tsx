import { useState } from "react"
import { useI18n } from "@/i18n"
import { Sensitive } from "@/components/ui/Sensitive"
import { cn } from "@/lib/utils"
import type { ExpenseAnalysisState } from "@/hooks/useExpenseAnalysis"
import {
  CategoryIcon,
  DeltaBadge,
  ProgressBar,
  fill,
  useCategoryLabel,
} from "./shared"

export function RankingList({
  state,
  initial = 10,
}: {
  state: ExpenseAnalysisState
  initial?: number
}) {
  const { t } = useI18n()
  const label = useCategoryLabel()
  const { ranking, selectedCategory, money } = state
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? ranking : ranking.slice(0, initial)
  return (
    <div className="space-y-1">
      {visible.map(r => (
        <button
          key={r.category}
          type="button"
          onClick={() => state.toggleCategory(r.category)}
          className={cn(
            "w-full rounded-md px-2 py-1.5 text-left transition-colors",
            selectedCategory === r.category
              ? "bg-accent ring-1 ring-primary/30"
              : "hover:bg-accent/60",
          )}
        >
          <div className="mb-1 flex items-center gap-2 text-sm">
            <CategoryIcon category={r.category} size="sm" />
            <span className="min-w-0 flex-1 truncate font-medium">
              {label(r.category)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (
                {fill(t.expenseAnalysis.ranking.times, {
                  n: r.count,
                })}
                )
              </span>
            </span>
            <span className="tabular-nums">
              <Sensitive>{money.format(r.value)}</Sensitive>
            </span>
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
              {money.formatPct(r.pct)}
            </span>
            <span className="w-14 text-right">
              <DeltaBadge delta={r.delta} invert />
            </span>
          </div>
          <ProgressBar pct={r.pct} color={r.color} />
        </button>
      ))}
      {ranking.length > initial && (
        <button
          type="button"
          className="w-full py-2 text-center text-sm font-medium text-primary hover:underline"
          onClick={() => setShowAll(v => !v)}
        >
          {showAll
            ? "Ver menos"
            : fill(t.expenseAnalysis.movements.showAll, {
                n: ranking.length,
              })}
        </button>
      )}
    </div>
  )
}
