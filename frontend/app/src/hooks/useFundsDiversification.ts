import { useEffect, useMemo, useState } from "react"
import {
  InstrumentType,
  type FundBreakdownSection,
  type FundBreakdownType,
  type InstrumentInfo,
} from "@/types"
import { getInstrumentDetails } from "@/services/api"
import type { StockFundPosition } from "@/utils/financialDataUtils"

export interface DiversificationRow {
  key: string
  label: string
  weightedPct: number
}

export interface DiversificationTab {
  key: FundBreakdownType
  rows: DiversificationRow[]
}

export interface FundsDiversificationResult {
  isLoading: boolean
  tabs: DiversificationTab[]
  totalFundCount: number
  withBreakdownCount: number
  missingBreakdownCount: number
  breakdownDate: string | null
  hasAnyData: boolean
  eligibleFunds: EligibleFund[]
  selectedIsins: Set<string>
  setSelectedIsins: (isins: Set<string>) => void
}

export interface EligibleFund {
  isin: string
  name: string
  value: number
}

const FUND_BREAKDOWN_TYPES: FundBreakdownType[] = [
  "stock-sector",
  "regional-exposure",
  "asset-allocation",
  "market-capitalization",
]

const clientCache = new Map<string, InstrumentInfo>()

const fetchBreakdownForIsin = async (
  isin: string,
): Promise<InstrumentInfo | null> => {
  const cached = clientCache.get(isin)
  if (cached) return cached
  try {
    const info = await getInstrumentDetails({
      type: InstrumentType.MUTUAL_FUND,
      isin,
    })
    if (info) {
      clientCache.set(isin, info)
    }
    return info
  } catch {
    return null
  }
}

const formatBreakdownDate = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return `${match[3]}/${match[2]}/${match[1]}`
}

export function useFundsDiversification(
  funds: StockFundPosition[],
): FundsDiversificationResult {
  const [breakdownByIsin, setBreakdownByIsin] = useState<
    Record<string, FundBreakdownSection[] | null>
  >({})
  const [breakdownDate, setBreakdownDate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIsins, setSelectedIsins] = useState<Set<string>>(new Set())

  const isinList = useMemo(() => {
    const set = new Set<string>()
    for (const fund of funds) {
      if (fund.isin) set.add(fund.isin)
    }
    return Array.from(set)
  }, [funds])

  // Funds that have a usable breakdown are eligible for selection in the UI
  const eligibleFunds = useMemo<EligibleFund[]>(() => {
    return funds
      .filter(fund => {
        const isin = fund.isin
        if (!isin) return false
        const sections = breakdownByIsin[isin]
        return Array.isArray(sections) && sections.length > 0
      })
      .map(fund => ({
        isin: fund.isin as string,
        name: fund.name || fund.isin || "",
        value: fund.value || 0,
      }))
  }, [funds, breakdownByIsin])

  // If a previously selected ISIN is no longer eligible, prune it
  useEffect(() => {
    const eligibleSet = new Set(eligibleFunds.map(f => f.isin))
    setSelectedIsins(prev => {
      let changed = false
      const next = new Set<string>()
      for (const isin of prev) {
        if (eligibleSet.has(isin)) {
          next.add(isin)
        } else {
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [eligibleFunds])

  useEffect(() => {
    let cancelled = false
    const unknownIsins = isinList.filter(isin => !(isin in breakdownByIsin))
    if (unknownIsins.length === 0) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    Promise.all(unknownIsins.map(isin => fetchBreakdownForIsin(isin))).then(
      results => {
        if (cancelled) return
        const nextBreakdown: Record<string, FundBreakdownSection[] | null> = {}
        let nextDate: string | null = null
        for (let i = 0; i < unknownIsins.length; i++) {
          const info = results[i]
          nextBreakdown[unknownIsins[i]] = info?.breakdown ?? null
          if (info?.breakdown_date && !nextDate) {
            nextDate = formatBreakdownDate(info.breakdown_date)
          }
        }
        setBreakdownByIsin(prev => ({ ...prev, ...nextBreakdown }))
        if (nextDate) {
          setBreakdownDate(prev => prev ?? nextDate)
        }
        setIsLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [isinList, breakdownByIsin])

  const { tabs, withBreakdownCount, missingBreakdownCount, hasAnyData } =
    useMemo(() => {
      const eligibleIsins = new Set(eligibleFunds.map(f => f.isin))
      const activeIsins =
        selectedIsins.size > 0
          ? new Set(
              Array.from(selectedIsins).filter(isin => eligibleIsins.has(isin)),
            )
          : eligibleIsins

      const activeFunds = funds.filter(fund => {
        const isin = fund.isin
        return isin ? activeIsins.has(isin) : false
      })
      const totalValue = activeFunds.reduce(
        (sum, fund) => sum + (fund.value || 0),
        0,
      )
      const accumulators: Record<FundBreakdownType, Record<string, number>> = {
        "stock-sector": {},
        "regional-exposure": {},
        "asset-allocation": {},
        "market-capitalization": {},
      }

      let withData = 0
      let missing = 0
      let anyData = false

      for (const fund of funds) {
        const isin = fund.isin
        if (!isin) {
          missing += 1
          continue
        }
        if (!activeIsins.has(isin)) {
          missing += 1
          continue
        }
        const sections = breakdownByIsin[isin]
        if (!sections || sections.length === 0) {
          missing += 1
          continue
        }
        const weight = totalValue > 0 ? fund.value / totalValue : 0
        withData += 1
        for (const section of sections) {
          if (!FUND_BREAKDOWN_TYPES.includes(section.type)) continue
          for (const item of section.items) {
            const contribution = (item.long_pct / 100) * weight * 100
            if (contribution <= 0) continue
            accumulators[section.type][item.label] =
              (accumulators[section.type][item.label] || 0) + contribution
            anyData = true
          }
        }
      }

      const builtTabs: DiversificationTab[] = FUND_BREAKDOWN_TYPES.map(type => {
        const sorted = Object.entries(accumulators[type])
          .map(([label, weightedPct]) => ({ key: label, label, weightedPct }))
          .sort((a, b) => b.weightedPct - a.weightedPct)
        return { key: type, rows: sorted }
      })

      return {
        tabs: builtTabs,
        withBreakdownCount: withData,
        missingBreakdownCount: missing,
        hasAnyData: anyData,
      }
    }, [funds, breakdownByIsin, eligibleFunds, selectedIsins])

  return {
    isLoading,
    tabs,
    totalFundCount: funds.length,
    withBreakdownCount,
    missingBreakdownCount,
    breakdownDate,
    hasAnyData,
    eligibleFunds,
    selectedIsins,
    setSelectedIsins,
  }
}