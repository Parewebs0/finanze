import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n"
import { Sensitive } from "@/components/ui/Sensitive"
import type { Rule503020Result } from "@/types/expenseAnalysis"
import { rule503020Slices } from "@/utils/expenseAnalysis/savingsMetrics"
import type { ExpenseAnalysisState } from "@/hooks/useExpenseAnalysis"

function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (acc, [k, v]) => acc.split(`{${k}}`).join(String(v)),
    template,
  )
}

const HINT = {
  needs: "Vivienda, suministros, supermercado, transporte y salud.",
  wants: "El resto de gastos (ocio, restaurantes, compras…).",
  savings: "Solo lo clasificado como ahorro e inversión.",
}

export function Rule503020Bars({
  rule,
  state,
}: {
  rule: Rule503020Result
  state: ExpenseAnalysisState
}) {
  const { t } = useI18n()
  const { money, current } = state
  const slices = rule503020Slices(current)
  const [open, setOpen] = useState<"needs" | "wants" | "savings" | null>(null)
  const labelOf = (id: string) =>
    id === "liquid"
      ? "Líquido en la cuenta"
      : ((t.expenseAnalysis.categories as Record<string, string>)[id] ?? id)

  const rows = [
    {
      key: "needs" as const,
      label: t.expenseAnalysis.rule.needs,
      color: "#6366f1",
      bucket: rule.needs,
      overIsBad: true,
    },
    {
      key: "wants" as const,
      label: t.expenseAnalysis.rule.wants,
      color: "#ec4899",
      bucket: rule.wants,
      overIsBad: true,
    },
    {
      key: "savings" as const,
      label: t.expenseAnalysis.rule.savings,
      color: "#22c55e",
      bucket: rule.savings,
      overIsBad: false,
    },
  ]

  return (
    <div className="space-y-4">
      {rows.map(r => {
        const off = r.overIsBad
          ? r.bucket.pct > r.bucket.target
          : r.bucket.pct < r.bucket.target
        const expanded = open === r.key
        const items = slices[r.key]
        return (
          <div key={r.key} className="space-y-1.5">
            <button
              type="button"
              className="flex w-full items-baseline justify-between gap-2 text-left text-sm"
              onClick={() => setOpen(expanded ? null : r.key)}
            >
              <span className="flex items-center gap-1 font-medium">
                {r.label}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </span>
              <span className="tabular-nums text-right">
                <span
                  className={cn(
                    "font-semibold",
                    off
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-green-600 dark:text-green-400",
                  )}
                >
                  {money.formatPct(r.bucket.pct, 1)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {" "}
                  /{" "}
                  {fill(t.expenseAnalysis.rule.target, {
                    pct: r.bucket.target,
                  })}
                </span>
              </span>
            </button>
            <div
              className="relative h-2 rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={Math.round(r.bucket.pct)}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, r.bucket.pct))}%`,
                  backgroundColor: r.color,
                }}
              />
              <div
                className="absolute -top-1 -bottom-1 w-0.5 rounded bg-foreground/60"
                style={{ left: `${r.bucket.target}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              <Sensitive className="text-muted-foreground">
                {money.format(r.bucket.value)}
              </Sensitive>
            </div>
            {expanded && (
              <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
                <p className="mb-2 text-xs text-muted-foreground">
                  {HINT[r.key]}
                </p>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-1.5">
                    {items.map(item => (
                      <li
                        key={String(item.category)}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate">{labelOf(item.category)}</span>
                        <Sensitive className="shrink-0 tabular-nums">
                          {money.format(item.value)}
                        </Sensitive>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
