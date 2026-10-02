import { useState } from "react"
import {
  BarChart3,
  Package,
  Loader2,
  Globe,
  MapPin,
  Banknote,
  TrendingUp,
  Factory,
  Cpu,
  Zap,
  Building2,
  ShoppingBag,
  ShoppingCart,
  HeartPulse,
  Fuel,
  Wheat,
  Landmark,
  Radio,
  Home,
  Briefcase,
  Coins,
  Check,
  ChevronsUpDown,
  type LucideIcon,
} from "lucide-react"
import { Command as CommandPrimitive } from "cmdk"
import {
  Card,
  CardContent,
} from "@/components/ui/Card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover"
import { Button as UIButton } from "@/components/ui/Button"
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

const REGION_ICONS: Record<string, LucideIcon> = {
  "Estados Unidos": MapPin,
  Japón: MapPin,
  "Reino Unido": MapPin,
  Canadá: MapPin,
  "Zona Euro": MapPin,
  Europa: MapPin,
  "Asia Desarrollada": MapPin,
  "Asia Emergente": MapPin,
  Australasia: MapPin,
  África: MapPin,
  "Oriente Medio": MapPin,
  Iberoamérica: MapPin,
  "Europa Emergente": MapPin,
  "Mercado Emergente": MapPin,
  "País Desarrollado": Globe,
  "No Clasificado": Globe,
}

const SECTOR_ICONS: Record<string, LucideIcon> = {
  Technology: Cpu,
  "Communication Services": Radio,
  "Consumer Cyclical": ShoppingCart,
  "Consumer Defensive": ShoppingBag,
  Healthcare: HeartPulse,
  Industrials: Factory,
  "Real Estate": Home,
  "Financial Services": Landmark,
  "Basic Materials": Wheat,
  Energy: Fuel,
  Utilities: Zap,
}

const ASSET_ICONS: Record<string, LucideIcon> = {
  Stock: TrendingUp,
  Bond: Banknote,
  Cash: Coins,
  Other: Briefcase,
  PreferredActions: Landmark,
  Convertible: Coins,
}

const CAP_ICONS: Record<string, LucideIcon> = {
  Giant: Building2,
  Large: Building2,
  Medium: Building2,
  Small: Building2,
  Micro: Building2,
}

const ICON_MAPS: Record<FundBreakdownType, Record<string, LucideIcon>> = {
  "stock-sector": SECTOR_ICONS,
  "regional-exposure": REGION_ICONS,
  "asset-allocation": ASSET_ICONS,
  "market-capitalization": CAP_ICONS,
}

const getCategoryIcon = (
  type: FundBreakdownType,
  label: string,
): LucideIcon | null => {
  const map = ICON_MAPS[type]
  if (map[label]) return map[label]
  const lower = label.toLowerCase()
  for (const [key, icon] of Object.entries(map)) {
    if (key.toLowerCase() === lower) return icon
  }
  return null
}

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

  const fundSelectorOptions = result.eligibleFunds.map(fund => ({
    value: fund.isin,
    label: fund.name,
  }))

  const selectedIsinList = Array.from(result.selectedIsins)
  const isAllSelected = selectedIsinList.length === 0
  const selectorValue = isAllSelected
    ? fundSelectorOptions.map(opt => opt.value)
    : selectedIsinList.filter(isin =>
        fundSelectorOptions.some(opt => opt.value === isin),
      )

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
          <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
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

        {fundSelectorOptions.length > 0 && (
          <div className="mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <UIButton
                  variant="outline"
                  role="combobox"
                  aria-label={t.funds.diversification.fundsSelectorLabel}
                  className={cn(
                    "w-full sm:w-[260px] justify-between text-xs font-normal",
                    !isAllSelected && "text-foreground",
                  )}
                >
                  <span className="truncate">
                    {isAllSelected
                      ? t.funds.diversification.fundsSelectorAll
                      : t.funds.diversification.fundsSelectorSome.replace(
                          "{count}",
                          String(selectedIsinList.length),
                        )}
                  </span>
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-60" />
                </UIButton>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={4}
                className="w-[var(--radix-popover-trigger-width)] p-0"
              >
                <CommandPrimitive>
                  <CommandPrimitive.Input
                    placeholder={t.funds.diversification.fundsSelectorSearch}
                    className="flex h-9 w-full rounded-none border-b border-input px-3 text-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <CommandPrimitive.List className="max-h-64 overflow-y-auto">
                    <CommandPrimitive.Empty className="py-4 text-center text-xs text-muted-foreground">
                      {t.funds.diversification.fundsSelectorNone}
                    </CommandPrimitive.Empty>
                    <CommandPrimitive.Group>
                      {fundSelectorOptions.map(opt => {
                        const isSelected = selectorValue.includes(opt.value)
                        return (
                          <CommandPrimitive.Item
                            key={opt.value}
                            value={opt.value}
                            onSelect={currentValue => {
                              const next = new Set(selectorValue)
                              if (next.has(currentValue)) {
                                next.delete(currentValue)
                              } else {
                                next.add(currentValue)
                              }
                              const eligibleSet = new Set(
                                fundSelectorOptions.map(o => o.value),
                              )
                              if (
                                next.size === 0 ||
                                next.size === eligibleSet.size
                              ) {
                                result.setSelectedIsins(new Set())
                              } else {
                                result.setSelectedIsins(next)
                              }
                            }}
                            className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                          >
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-input opacity-60",
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </span>
                            <span className="truncate">{opt.label}</span>
                          </CommandPrimitive.Item>
                        )
                      })}
                    </CommandPrimitive.Group>
                  </CommandPrimitive.List>
                </CommandPrimitive>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-5 border-b border-border mb-5 overflow-x-auto overflow-y-hidden whitespace-nowrap">
          {TAB_KEYS.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(tabClass(tab), "text-xs sm:text-sm shrink-0")}
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
                    className="py-2.5 border-b border-border/40 last:border-0"
                  >
                    <div className="grid grid-cols-[20px_minmax(0,1fr)_auto] sm:grid-cols-[20px_minmax(0,1fr)_auto_180px] items-center gap-3">
                      {(() => {
                        const Icon = getCategoryIcon(activeTab, row.label)
                        return Icon ? (
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <span className="h-4 w-4" aria-hidden="true" />
                        )
                      })()}
                      <span className="text-sm truncate">{row.label}</span>
                      <span className="text-sm font-bold tabular-nums">
                        {row.weightedPct.toFixed(1)}%
                      </span>
                      <div className="hidden sm:block h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="sm:hidden mt-2 ml-[32px] h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}