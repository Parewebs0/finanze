import { useState } from "react"
import { BarChart3, Package, Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
} from "@/components/ui/Card"
import { cn, fillTemplate } from "@/lib/utils"
import { useI18n } from "@/i18n"
import type { FundBreakdownType } from "@/types"
import type { FundsDiversificationResult } from "@/hooks/useFundsDiversification"

interface FundsDiversificationPanelProps {
  result: FundsDiversificationResult
}

const TAB_KEYS: FundBreakdownType[] = [
  "stock-sector",
  "regional-exposure",
  "asset-allocation",
  "market-capitalization",
]

export function FundsDiversificationPanel({
  result,
}: FundsDiversificationPanelProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<FundBreakdownType>(
    "regional-exposure",
  )

  const activeRows =
    result.tabs.find(tab => tab.key === activeTab)?.rows ?? []
  const hasRows = activeRows.length > 0

  const tabClass = (tab: FundBreakdownType) =>
    cn(
      "px-0 pb-2.5 pt-1 text-sm font-medium transition-colors",
      tab === activeTab
        ? "text-foreground font-semibold border-b-2 border-foreground -mb-px"
        : "text-muted-foreground hover:text-foreground",
    )

  const tabLabel = (tab: FundBreakdownType) => {
    switch (tab) {
      case "stock-sector":
        return t.funds.diversification.tabSectorial
      case "regional-exposure":
        return t.funds.diversification.tabRegional
      case "asset-allocation":
        return t.funds.diversification.tabAssetAllocation
      case "market-capitalization":
        return t.funds.diversification.tabCapitalization
    }
  }

  const tabSubtitle = (tab: FundBreakdownType) => {
    switch (tab) {
      case "stock-sector":
        return t.funds.diversification.subtitleSectorial
      case "regional-exposure":
        return t.funds.diversification.subtitleRegional
      case "asset-allocation":
        return t.funds.diversification.subtitleAssetAllocation
      case "market-capitalization":
        return t.funds.diversification.subtitleCapitalization
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t.funds.diversification.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            <span>
              {fillTemplate(t.funds.diversification.summary, {
                count: result.totalFundCount,
                covered: result.withBreakdownCount,
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5 border-b border-border mb-5 overflow-x-auto">
          {TAB_KEYS.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={tabClass(tab)}
            >
              {tabLabel(tab)}
            </button>
          ))}
        </div>

        {result.isLoading && !result.hasAnyData ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.funds.diversification.loading}
          </div>
        ) : !hasRows ? (
          <div className="py-10 text-center">
            <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              {t.funds.diversification.emptyTitle}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.funds.diversification.emptyDescription}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              {tabSubtitle(activeTab)}
            </p>

            <div className="space-y-0">
              {activeRows.map(row => {
                const max = activeRows[0]?.weightedPct ?? 0
                const widthPct = max > 0 ? (row.weightedPct / max) * 100 : 0
                return (
                  <div
                    key={row.key}
                    className="grid grid-cols-[1fr_auto_180px] items-center gap-3 py-2.5 border-b border-border/40 last:border-0"
                  >
                    <span className="text-sm truncate">{row.label}</span>
                    <span className="text-sm font-bold tabular-nums">
                      {row.weightedPct.toFixed(1)}%
                    </span>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              {fillTemplate(t.funds.diversification.footer, {
                date: result.breakdownDate ?? "—",
                missing: result.missingBreakdownCount,
              })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}