import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAppContext } from "@/context/AppContext"
import { useI18n } from "@/i18n"
import { useDataDisplayMode } from "@/context/DataDisplayModeContext"
import {
  categorizePayments,
  connectCategorizer,
  disconnectCategorizer,
  getAccountTransactionsInRange,
  getCategorizerStatus,
  type CategorizerProvider,
  type CategorizerStatus,
} from "@/services/api"
import { loadJevContext } from "@/utils/expenseAnalysis/jevContext"
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters"
import { DataDisplayMode } from "@/types"
import type { AccountTx } from "@/types/transactions"
import type {
  AnalysisTx,
  DateRange,
  ExpenseAnalysisConfig,
  ExpenseCategoryId,
  ExpenseSplitPart,
  PresetRange,
  RangePreset,
} from "@/types/expenseAnalysis"
import {
  applySplits,
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
  isAnalysisSource,
  isCategoryId,
} from "@/utils/expenseAnalysis"

const RECURRING_MONTHS = 6

function normalizeConfig(
  raw: Partial<ExpenseAnalysisConfig> | undefined,
): ExpenseAnalysisConfig {
  return {
    rules: raw?.rules ?? [],
    budgets: raw?.budgets ?? [],
    overrides: raw?.overrides ?? [],
    excluded: raw?.excluded ?? [],
    splits: raw?.splits ?? [],
    planBudgets: raw?.planBudgets ?? [],
    planIncomes: raw?.planIncomes ?? [],
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

  const setPlanBudget = useCallback(
    (category: ExpenseCategoryId, amount: number) =>
      persist({
        ...config,
        planBudgets: [
          ...(config.planBudgets ?? []).filter(b => b.category !== category),
          { category, amount },
        ],
      }),
    [config, persist],
  )

  const removePlanBudget = useCallback(
    (category: ExpenseCategoryId) =>
      persist({
        ...config,
        planBudgets: (config.planBudgets ?? []).filter(
          b => b.category !== category,
        ),
      }),
    [config, persist],
  )

  const setPlanIncome = useCallback(
    (category: ExpenseCategoryId, amount: number) =>
      persist({
        ...config,
        planIncomes: [
          ...(config.planIncomes ?? []).filter(b => b.category !== category),
          { category, amount },
        ],
      }),
    [config, persist],
  )

  const removePlanIncome = useCallback(
    (category: ExpenseCategoryId) =>
      persist({
        ...config,
        planIncomes: (config.planIncomes ?? []).filter(
          b => b.category !== category,
        ),
      }),
    [config, persist],
  )

  const setSplit = useCallback(
    (parentId: string, parts: ExpenseSplitPart[]) =>
      persist({
        ...config,
        splits: [
          ...(config.splits ?? []).filter(s => s.parentId !== parentId),
          { parentId, parts },
        ],
      }),
    [config, persist],
  )

  const removeSplit = useCallback(
    (parentId: string) =>
      persist({
        ...config,
        splits: (config.splits ?? []).filter(s => s.parentId !== parentId),
      }),
    [config, persist],
  )

  const recategorize = useCallback(
    (tx: AnalysisTx, category: ExpenseCategoryId) => {
      return persist({
        ...config,
        overrides: [
          ...config.overrides.filter(o => o.txId !== tx.id),
          { txId: tx.id, category },
        ],
      })
    },
    [config, persist],
  )

  return {
    config,
    setBudget,
    removeBudget,
    setPlanBudget,
    removePlanBudget,
    setPlanIncome,
    removePlanIncome,
    setSplit,
    removeSplit,
    recategorize,
    toggleExcluded: (txId: string) => {
      const excluded = config.excluded.includes(txId)
        ? config.excluded.filter(id => id !== txId)
        : [...config.excluded, txId]
      return persist({ ...config, excluded })
    },
    applyCategories: (
      assignments: { txId: string; category: ExpenseCategoryId }[],
    ) => {
      const ids = new Set(assignments.map(item => item.txId))
      return persist({
        ...config,
        overrides: [
          ...config.overrides.filter(item => !ids.has(item.txId)),
          ...assignments,
        ],
      })
    },
  }
}

/**
 * Single source of truth for the analysis page. Both the desktop and the
 * mobile components consume this hook's result and never compute anything
 * on their own.
 */
export function useExpenseAnalysis() {
  const { settings, exchangeRates, entities, entitiesLoaded } = useAppContext()
  const navigate = useNavigate()
  const money = useAnalysisMoney()
  const configApi = useExpenseAnalysisConfig()
  const { config } = configApi
  const [params, setParams] = useSearchParams()

  const [range, setRangeParam] = useAnalysisDateRange()
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategoryId | null>(null)
  /** Range picked on the chart / heatmap; overrides the picker range. */
  const [brush, setBrush] = useState<DateRange | null>(null)

  const [rawTxs, setRawTxs] = useState<AccountTx[]>([])
  const [loadedWindow, setLoadedWindow] = useState<DateRange | null>(null)
  const [loadedEntityId, setLoadedEntityId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categorizer, setCategorizer] = useState<CategorizerStatus | null>(null)
  const [categorizerBusy, setCategorizerBusy] = useState(false)
  const [categorizing, setCategorizing] = useState(false)
  const [categorizerError, setCategorizerError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const analysisEntities = useMemo(
    () => entities.filter(isAnalysisSource),
    [entities],
  )
  const entityParam = params.get("entity")
  /** undefined while entities are still loading; null when none are connected. */
  const resolvedEntityId = useMemo(() => {
    if (!entitiesLoaded) return undefined
    if (
      entityParam &&
      analysisEntities.some(entity => entity.id === entityParam)
    ) {
      return entityParam
    }
    // Prefer the entity the user picked last time (persisted across visits).
    try {
      const stored = localStorage.getItem("finanze.expenseAnalysis.entity")
      if (
        stored &&
        analysisEntities.some(entity => entity.id === stored)
      ) {
        return stored
      }
    } catch {
      /* ignore */
    }
    // Default to Santander (BSCHESMMXXX, or any name containing "santander")
    // so the user doesn't have to keep re-picking a bank every time the page
    // is opened. Investor / Trade Republic entities don't carry account
    // transactions, so they make no sense as default for this view.
    const santander = analysisEntities.find(
      entity =>
        entity.natural_id === "BSCHESMMXXX" ||
        /santander/i.test(entity.name ?? ""),
    )
    if (santander) return santander.id
    return analysisEntities[0]?.id ?? null
  }, [entitiesLoaded, entityParam, analysisEntities])
  const selectedEntity =
    analysisEntities.find(entity => entity.id === resolvedEntityId) ?? null

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

  const setSelectedEntity = useCallback(
    (id: string) => {
      setParams(
        prev => {
          const next = new URLSearchParams(prev)
          next.set("entity", id)
          return next
        },
        { replace: true },
      )
      setBrush(null)
      setSelectedCategory(null)
    },
    [setParams],
  )

  // Persist the resolved entity so it survives page reloads and tab
  // switches. Skips the first render (entities still loading).
  useEffect(() => {
    if (!resolvedEntityId) return
    try {
      localStorage.setItem(
        "finanze.expenseAnalysis.entity",
        resolvedEntityId,
      )
    } catch {
      /* ignore */
    }
  }, [resolvedEntityId])

  useEffect(() => {
    if (!resolvedEntityId || entityParam === resolvedEntityId) return
    setParams(
      prev => {
        const next = new URLSearchParams(prev)
        next.set("entity", resolvedEntityId)
        return next
      },
      { replace: true },
    )
  }, [resolvedEntityId, entityParam, setParams])

  const load = useCallback(async (window: DateRange, entityId: string) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const txs = await getAccountTransactionsInRange(
        window.from,
        window.to,
        entityId,
      )
      if (requestId !== requestIdRef.current) return
      setRawTxs(txs)
      setLoadedWindow(window)
      setLoadedEntityId(entityId)
    } catch (e) {
      if (requestId !== requestIdRef.current) return
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (resolvedEntityId === undefined) return
    if (!resolvedEntityId) {
      setRawTxs([])
      setLoadedEntityId(null)
      setLoadedWindow(null)
      setLoading(false)
      return
    }
    const covered =
      loadedEntityId === resolvedEntityId &&
      loadedWindow != null &&
      loadedWindow.from <= needed.from &&
      loadedWindow.to >= needed.to
    if (!covered) {
      if (loadedEntityId !== resolvedEntityId) setRawTxs([])
      void load(needed, resolvedEntityId)
    }
  }, [resolvedEntityId, needed, loadedWindow, loadedEntityId, load])

  const reload = useCallback(() => {
    if (resolvedEntityId) void load(needed, resolvedEntityId)
  }, [load, needed, resolvedEntityId])

  const scopedTxs = useMemo(
    () =>
      resolvedEntityId
        ? rawTxs.filter(tx => tx.entity?.id === resolvedEntityId)
        : [],
    [rawTxs, resolvedEntityId],
  )

  const excludedIds = useMemo(
    () => new Set(config.excluded),
    [config.excluded],
  )
  const allTxs = useMemo(() => {
    const base = toAnalysisTxs(scopedTxs, {
      targetCurrency: money.currency,
      exchangeRates,
      categorizer: createCategorizer(config),
    })
    // Apply user splits. If the parent was excluded, propagate that to the
    // children too so they don't sneak back into totals.
    const split = applySplits(base, config.splits ?? [])
    return split.map(tx => ({
      ...tx,
      excluded: excludedIds.has(tx.id) || excludedIds.has(tx.parentId ?? ""),
    }))
  }, [scopedTxs, money.currency, exchangeRates, config, excludedIds])
  /** Payments that still count. Excluded ones stay in the movement list only. */
  const txs = useMemo(
    () => allTxs.filter(tx => !tx.excluded),
    [allTxs],
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
    return filterRange(allTxs, scope).filter(
      tx => !selectedCategory || tx.category === selectedCategory,
    )
  }, [allTxs, brush, range, selectedCategory])

  const uncategorizedCount = useMemo(
    () =>
      filterRange(txs, effectiveRange).filter(
        tx => tx.category === "uncategorized",
      ).length,
    [txs, effectiveRange],
  )

  const hasAnyTransactions = scopedTxs.length > 0
  const hasConnectedSources = analysisEntities.length > 0

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
      const query = new URLSearchParams({
        from_date: r.from,
        to_date: r.to,
      })
      if (resolvedEntityId) query.set("entity", resolvedEntityId)
      navigate(`/transactions?${query.toString()}`)
    },
    [navigate, effectiveRange, resolvedEntityId],
  )

  const refreshCategorizer = useCallback(async () => {
    try {
      setCategorizer(await getCategorizerStatus())
    } catch (e) {
      setCategorizerError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void refreshCategorizer()
  }, [refreshCategorizer])

  const connectJev = useCallback(
    async (provider: CategorizerProvider, apiKey: string) => {
      setCategorizerBusy(true)
      setCategorizerError(null)
      try {
        setCategorizer(await connectCategorizer(provider, apiKey))
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        setCategorizerError(message)
        throw e
      } finally {
        setCategorizerBusy(false)
      }
    },
    [],
  )

  const disconnectJev = useCallback(async () => {
    setCategorizerBusy(true)
    setCategorizerError(null)
    try {
      await disconnectCategorizer()
      setCategorizer({ connected: false, provider: null, keyHint: null })
    } catch (e) {
      setCategorizerError(e instanceof Error ? e.message : String(e))
    } finally {
      setCategorizerBusy(false)
    }
  }, [])

  const recategorizeWithJev = useCallback(
    async (onlyUncategorized: boolean) => {
      const source = filterRange(txs, effectiveRange).filter(
        tx => !onlyUncategorized || tx.category === "uncategorized",
      )
      if (source.length === 0) return 0
      setCategorizing(true)
      setCategorizerError(null)
      try {
        const result = await categorizePayments(
          source.map(tx => ({
            id: tx.id,
            concept: tx.concept,
            amount: tx.amount,
            currency: tx.currency,
            date: tx.date,
            entityName: tx.entityName,
          })),
          loadJevContext(),
        )
        const assignments = result.assignments.flatMap(item =>
          isCategoryId(item.category)
            ? [{ txId: item.id, category: item.category }]
            : [],
        )
        if (assignments.length > 0) {
          await configApi.applyCategories(assignments)
        }
        return assignments.length
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        setCategorizerError(message)
        throw e
      } finally {
        setCategorizing(false)
      }
    },
    [txs, effectiveRange, configApi],
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
    hasConnectedSources,
    analysisEntities,
    selectedEntityId: resolvedEntityId ?? null,
    selectedEntity,
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
    categorizer,
    categorizerBusy,
    categorizing,
    categorizerError,
    // formatting
    money,
    // actions
    setRange,
    setPreset,
    setSelectedEntity,
    toggleCategory,
    setSelectedCategory,
    selectDay,
    selectBrush,
    clearBrush,
    clearSelection,
    openTransactions,
    connectJev,
    disconnectJev,
    recategorizeWithJev,
    reload,
    isInEffectiveRange: (d: string) => isInRange(d, effectiveRange),
    configApi,
  }
}

export type ExpenseAnalysisState = ReturnType<typeof useExpenseAnalysis>
