import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAppContext } from "@/context/AppContext"
import { useI18n } from "@/i18n"
import { useDataDisplayMode } from "@/context/DataDisplayModeContext"
import { getAccountTransactionsInRange } from "@/services/api"
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters"
import { DataDisplayMode } from "@/types"
import type { AccountTx } from "@/types/transactions"
import type {
  AnalysisTx,
  DateRange,
  ExpenseAnalysisConfig,
  ExpenseCategoryId,
  PresetRange,
  RangePreset,
} from "@/types/expenseAnalysis"
import {
  budgetStatus,
  categoryRanking,
  createCategorizer,
  dailyCashflow,
  detectPreset,
  detectRecurring,
  filterRange,
  isInRange,
  monthlyEvolution,
  parseIsoDate,
  patternFromConcept,
  pctDelta,
  presetRange,
  previousRange,
  rangeAggregates,
  requiredWindow,
  rule503020,
  savingsRate,
  spendingHeatmap,
  toAnalysisTxs,
  topMerchants,
} from "@/utils/expenseAnalysis"

const RECURRING_MONTHS = 6

function normalizeConfig(
  raw: Partial<ExpenseAnalysisConfig> | undefined,
): ExpenseAnalysisConfig {
  return {
    rules: raw?.rules ?? [],
    budgets: raw?.budgets ?? [],
    overrides: raw?.overrides ?? [],
  }
}

/** Sentence case for locale dates ("martes, 1 de septiembre" → "Martes, …") */
export function capitalizeFirst(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1)
}

/** Range persisted in the URL (?from=&to=) like Ledger's useDateRange. */
export function useAnalysisDateRange(): [
  PresetRange,
  (range: DateRange, preset?: RangePreset) => void,
] {
  const [params, setParams] = useSearchParams()
  const from = params.get("from")
  const to = params.get("to")
  const range = useMemo(() => detectPreset(from, to), [from, to])
  const setRange = useCallback(
    (next: DateRange) => {
      setParams(
        prev => {
          const p = new URLSearchParams(prev)
          p.set("from", next.from)
          p.set("to", next.to)
          return p
        },
        { replace: true },
      )
    },
    [setParams],
  )
  return [range, setRange]
}

/** Currency/privacy aware formatters shared by both views. */
export function useAnalysisMoney() {
  const { settings } = useAppContext()
  const { locale } = useI18n()
  const { mode } = useDataDisplayMode()
  const currency = settings?.general?.defaultCurrency || "EUR"
  const isPrivate = mode === DataDisplayMode.PRIVATE

  return useMemo(
    () => ({
      currency,
      locale,
      isPrivate,
      format: (n: number) => formatCurrency(n, locale, currency),
      formatSigned: (n: number) =>
        `${n > 0 ? "+" : ""}${formatCurrency(n, locale, currency)}`,
      /** For chart axes/tooltips, which can't use <Sensitive> */
      formatChart: (n: number) =>
        isPrivate ? "••••" : formatCompactCurrency(n, locale, currency),
      formatPct: (n: number, digits = 0) =>
        `${n.toLocaleString(locale, {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        })}%`,
      formatDay: (iso: string) =>
        parseIsoDate(iso).toLocaleDateString(locale, {
          day: "numeric",
          month: "short",
        }),
      formatLongDay: (iso: string) =>
        capitalizeFirst(
          parseIsoDate(iso).toLocaleDateString(locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
        ),
      formatMonth: (yyyyMm: string) =>
        parseIsoDate(`${yyyyMm}-01`).toLocaleDateString(locale, {
          month: "short",
          year: "2-digit",
        }),
    }),
    [currency, locale, isPrivate],
  )
}

/** Categorization rules, budgets and overrides stored in Finanze settings. */
export function useExpenseAnalysisConfig() {
  const { settings, saveSettings } = useAppContext()
  const config = useMemo(
    () => normalizeConfig(settings?.expenseAnalysis),
    [settings?.expenseAnalysis],
  )

  const persist = useCallback(
    async (next: ExpenseAnalysisConfig) => {
      return saveSettings(
        { ...settings, expenseAnalysis: next },
        { silent: true },
      )
    },
    [settings, saveSettings],
  )

  const addRule = useCallback(
    (pattern: string, category: ExpenseCategoryId, amount?: number | null) =>
      persist({
        ...config,
        rules: [
          ...config.rules,
          {
            pattern,
            category,
            amount: amount === undefined || amount === null ? null : amount,
          },
        ],
      }),
    [config, persist],
  )

  const removeRule = useCallback(
    (index: number) =>
      persist({ ...config, rules: config.rules.filter((_, i) => i !== index) }),
    [config, persist],
  )

  const setBudget = useCallback(
    (category: ExpenseCategoryId, amount: number) =>
      persist({
        ...config,
        budgets: [
          ...config.budgets.filter(b => b.category !== category),
          { category, amount },
        ],
      }),
    [config, persist],
  )

  const removeBudget = useCallback(
    (category: ExpenseCategoryId) =>
      persist({
        ...config,
        budgets: config.budgets.filter(b => b.category !== category),
      }),
    [config, persist],
  )

  /** Ledger "recategorize" (+ optional "create rule" learning). */
  const recategorize = useCallback(
    (tx: AnalysisTx, category: ExpenseCategoryId, createRule: boolean) => {
      const overrides = [
        ...config.overrides.filter(o => o.txId !== tx.id),
        { txId: tx.id, category },
      ]
      const rules = createRule
        ? [
            ...config.rules,
            { pattern: patternFromConcept(tx.concept), category, amount: null },
          ]
        : config.rules
      return persist({ ...config, overrides, rules })
    },
    [config, persist],
  )

  return {
    config,
    addRule,
    removeRule,
    setBudget,
    removeBudget,
    recategorize,
  }
}

/**
 * Single source of truth for the analysis page. Both the desktop and the
 * mobile components consume this hook's result and never compute anything
 * on their own.
 */
export function useExpenseAnalysis() {
  const { settings, exchangeRates } = useAppContext()
  const navigate = useNavigate()
  const money = useAnalysisMoney()
  const configApi = useExpenseAnalysisConfig()
  const { config } = configApi

  const [range, setRangeParam] = useAnalysisDateRange()
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategoryId | null>(null)
  /** Range picked on the chart / heatmap; overrides the picker range. */
  const [brush, setBrush] = useState<DateRange | null>(null)

  const [rawTxs, setRawTxs] = useState<AccountTx[]>([])
  const [loadedWindow, setLoadedWindow] = useState<DateRange | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const effectiveRange: DateRange = useMemo(
    () => brush ?? range,
    [brush, range],
  )
  const previous = useMemo(
    () => previousRange(effectiveRange),
    [effectiveRange],
  )
  const needed = useMemo(
    () => requiredWindow(range, previousRange(range)),
    [range],
  )
  const heatmapYear = parseIsoDate(effectiveRange.to).getFullYear()

  const load = useCallback(async (window: DateRange) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const txs = await getAccountTransactionsInRange(window.from, window.to)
      if (requestId !== requestIdRef.current) return
      setRawTxs(txs)
      setLoadedWindow(window)
    } catch (e) {
      if (requestId !== requestIdRef.current) return
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const covered =
      loadedWindow &&
      loadedWindow.from <= needed.from &&
      loadedWindow.to >= needed.to
    if (!covered) void load(needed)
  }, [needed, loadedWindow, load])

  const reload = useCallback(() => load(needed), [load, needed])

  const txs = useMemo(
    () =>
      toAnalysisTxs(rawTxs, {
        targetCurrency: money.currency,
        exchangeRates,
        categorizer: createCategorizer(config),
      }),
    [rawTxs, money.currency, exchangeRates, config],
  )

  const current = useMemo(
    () => rangeAggregates(txs, effectiveRange),
    [txs, effectiveRange],
  )
  const prev = useMemo(() => rangeAggregates(txs, previous), [txs, previous])

  const kpis = useMemo(
    () => ({
      income: {
        value: current.income,
        delta: pctDelta(current.income, prev.income),
      },
      expenses: {
        value: current.expenses,
        delta: pctDelta(current.expenses, prev.expenses),
      },
      savingsRate: {
        value: savingsRate(current),
        savings: current.savings,
        invested: current.savingsInvestment,
      },
      avgDailySpend: {
        value: current.avgDailySpend,
        delta: pctDelta(current.avgDailySpend, prev.avgDailySpend),
      },
    }),
    [current, prev],
  )

  const ranking = useMemo(() => categoryRanking(current, prev), [current, prev])
  const selectedRanking = selectedCategory
    ? (ranking.find(r => r.category === selectedCategory) ?? null)
    : null

  const daily = useMemo(
    () => dailyCashflow(txs, effectiveRange, selectedCategory),
    [txs, effectiveRange, selectedCategory],
  )
  const heatmap = useMemo(
    () => spendingHeatmap(txs, heatmapYear, selectedCategory),
    [txs, heatmapYear, selectedCategory],
  )
  const recurring = useMemo(() => detectRecurring(txs, RECURRING_MONTHS), [txs])
  const rule = useMemo(() => rule503020(current), [current])
  const budgets = useMemo(
    () => budgetStatus(txs, config.budgets, effectiveRange),
    [txs, config.budgets, effectiveRange],
  )
  const evolution = useMemo(() => monthlyEvolution(txs), [txs])
  const merchants = useMemo(
    () => topMerchants(txs, effectiveRange),
    [txs, effectiveRange],
  )

  const selectedDay =
    brush && brush.from === brush.to ? brush.from : (null as string | null)

  /** Movements of the current selection (day, or range + category). */
  const selectionTxs = useMemo(() => {
    const scope = brush ?? range
    return filterRange(txs, scope).filter(
      tx => !selectedCategory || tx.category === selectedCategory,
    )
  }, [txs, brush, range, selectedCategory])

  const uncategorizedCount = useMemo(
    () =>
      filterRange(txs, effectiveRange).filter(
        tx => tx.category === "uncategorized",
      ).length,
    [txs, effectiveRange],
  )

  const hasAnyTransactions = rawTxs.length > 0

  // ---- actions ----
  const setRange = useCallback(
    (next: DateRange) => {
      setRangeParam(next)
      setBrush(null)
    },
    [setRangeParam],
  )
  const setPreset = useCallback(
    (preset: RangePreset) => {
      if (preset === "custom") return
      setRange(presetRange(preset))
    },
    [setRange],
  )
  const toggleCategory = useCallback(
    (category: ExpenseCategoryId) =>
      setSelectedCategory(c => (c === category ? null : category)),
    [],
  )
  const selectDay = useCallback(
    (day: string | null) => setBrush(day ? { from: day, to: day } : null),
    [],
  )
  const selectBrush = useCallback((a: string, b: string) => {
    setBrush(a <= b ? { from: a, to: b } : { from: b, to: a })
  }, [])
  const clearSelection = useCallback(() => {
    setBrush(null)
    setSelectedCategory(null)
  }, [])
  const clearBrush = useCallback(() => setBrush(null), [])
  const openTransactions = useCallback(
    (scope?: DateRange) => {
      const r = scope ?? effectiveRange
      navigate(`/transactions?from_date=${r.from}&to_date=${r.to}`)
    },
    [navigate, effectiveRange],
  )

  return {
    // state
    range,
    effectiveRange,
    previousRange: previous,
    brush,
    selectedDay,
    selectedCategory,
    selectedRanking,
    loading,
    error,
    hasAnyTransactions,
    defaultCurrency: settings?.general?.defaultCurrency || "EUR",
    // derived data
    txs,
    kpis,
    current,
    ranking,
    daily,
    heatmap,
    heatmapYear,
    recurring,
    recurringMonths: RECURRING_MONTHS,
    rule,
    budgets,
    evolution,
    merchants,
    selectionTxs,
    uncategorizedCount,
    config,
    // formatting
    money,
    // actions
    setRange,
    setPreset,
    toggleCategory,
    setSelectedCategory,
    selectDay,
    selectBrush,
    clearBrush,
    clearSelection,
    openTransactions,
    reload,
    isInEffectiveRange: (d: string) => isInRange(d, effectiveRange),
    configApi,
  }
}

export type ExpenseAnalysisState = ReturnType<typeof useExpenseAnalysis>
