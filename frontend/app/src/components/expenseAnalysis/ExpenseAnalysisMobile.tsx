import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChartPie,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  RefreshCw,
  Repeat,
  Scale,
  ShoppingBag,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n"
import { fadeListContainer, fadeListItem } from "@/lib/animations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Sensitive } from "@/components/ui/Sensitive"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import {
  capitalizeFirst,
  type ExpenseAnalysisState,
} from "@/hooks/useExpenseAnalysis"
import { RANGE_PRESETS, monthGrid, parseIsoDate } from "@/utils/expenseAnalysis"
import {
  BudgetsEditor,
  CHART_AXIS_TICK,
  CHART_EXPENSE_COLOR,
  CHART_GRID_STROKE,
  CHART_INCOME_COLOR,
  CategoryIcon,
  CustomRangeInputs,
  DeltaBadge,
  EmptyHint,
  MerchantsList,
  MovementRow,
  PAGE_CARD_CLASS,
  ProgressBar,
  RecurringList,
  Rule503020Bars,
  fill,
  useCategoryLabel,
} from "./shared"
import { AnalysisEntitySelector } from "./AnalysisEntitySelector"
import { CategorizerCard } from "./CategorizerCard"

type Props = { state: ExpenseAnalysisState }

const MOVEMENTS_PAGE = 20

function MobileSection({
  title,
  icon: Icon,
  subtitle,
  children,
}: {
  title: string
  icon: typeof Activity
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card className={PAGE_CARD_CLASS}>
      <CardHeader className="pb-3 space-y-1">
        <CardTitle className="text-lg font-bold flex items-center">
          <Icon className="h-5 w-5 mr-2 text-primary" />
          {title}
        </CardTitle>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

function MobileKpi({
  icon: Icon,
  iconClass,
  label,
  value,
  delta,
  invert,
  sub,
}: {
  icon: typeof Activity
  iconClass: string
  label: string
  value: string
  delta?: number | null
  invert?: boolean
  sub?: React.ReactNode
}) {
  return (
    <Card className="p-3">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
        <span className="truncate text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-lg font-bold leading-tight tabular-nums">
        <Sensitive>{value}</Sensitive>
      </div>
      <div className="mt-1 min-h-4 truncate text-[11px] text-muted-foreground">
        {delta !== undefined ? (
          <DeltaBadge delta={delta ?? null} invert={invert} />
        ) : (
          sub
        )}
      </div>
    </Card>
  )
}

function MovementsList({ state, title }: Props & { title: string }) {
  const { t } = useI18n()
  const { selectionTxs, money, brush, openTransactions } = state
  const [limit, setLimit] = useState(MOVEMENTS_PAGE)
  const total = selectionTxs.reduce(
    (sum, tx) => (tx.excluded ? sum : sum + tx.amount),
    0,
  )
  return (
    <MobileSection title={title} icon={CalendarDays}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-base font-semibold tabular-nums",
            total >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400",
          )}
        >
          <Sensitive>{money.formatSigned(total)}</Sensitive>
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => openTransactions(brush ?? undefined)}
        >
          <ArrowRight className="h-4 w-4 mr-1" />
          {t.expenseAnalysis.viewTransactions}
        </Button>
      </div>
      {selectionTxs.length === 0 ? (
        <EmptyHint>{t.expenseAnalysis.movements.empty}</EmptyHint>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {selectionTxs.slice(0, limit).map(tx => (
              <MovementRow key={tx.id} tx={tx} state={state} touch />
            ))}
          </ul>
          {selectionTxs.length > limit && (
            <Button
              variant="ghost"
              className="mt-2 h-11 w-full"
              onClick={() => setLimit(l => l + MOVEMENTS_PAGE * 2)}
            >
              {fill(t.expenseAnalysis.movements.showAll, {
                n: selectionTxs.length,
              })}
            </Button>
          )}
        </>
      )}
    </MobileSection>
  )
}

/** Month calendar heatmap: thumb-sized cells instead of the 53-week grid. */
function MonthCalendarHeatmap({ state }: Props) {
  const { t } = useI18n()
  const { heatmap, selectedDay, selectDay, money, effectiveRange } = state
  const initial = parseIsoDate(selectedDay ?? effectiveRange.to)
  const [cursor, setCursor] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  })
  // The hook computes the heatmap for the range's year; months of other years
  // are rendered from the same data (empty when not loaded).
  const rows = useMemo(
    () => monthGrid(heatmap, cursor.year, cursor.month),
    [heatmap, cursor],
  )
  const max = useMemo(
    () => Math.max(1, ...heatmap.map(d => d.spent)),
    [heatmap],
  )
  const monthTotal = rows.flat().reduce((s, c) => s + (c?.spent ?? 0), 0)
  const weekdays = useMemo(() => {
    const monday = new Date(2024, 0, 1)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d.toLocaleDateString(money.locale, { weekday: "narrow" })
    })
  }, [money.locale])
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    money.locale,
    { month: "long", year: "numeric" },
  )
  const move = (delta: number) =>
    setCursor(c => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  const inHeatmapYear = cursor.year === state.heatmapYear

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={() => move(-1)}
          aria-label="-1"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold">{capitalizeFirst(monthLabel)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            <Sensitive className="text-muted-foreground">
              {fill(t.expenseAnalysis.heatmap.spent, {
                amount: money.format(monthTotal),
              })}
            </Sensitive>
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={() => move(1)}
          aria-label="+1"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-1">
        {weekdays.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {rows.flat().map((cell, i) =>
          cell === null ? (
            <div key={i} className="aspect-square" />
          ) : (
            <button
              key={cell.date}
              type="button"
              onClick={() =>
                selectDay(cell.date === selectedDay ? null : cell.date)
              }
              className={cn(
                "aspect-square min-h-[40px] rounded-md text-xs font-medium tabular-nums transition-transform active:scale-95",
                cell.spent <= 0 && "bg-muted text-muted-foreground",
                cell.spent > 0 && "text-white",
                cell.date === selectedDay &&
                  "ring-2 ring-primary ring-offset-1 ring-offset-background",
              )}
              style={
                cell.spent > 0
                  ? {
                      backgroundColor: `rgba(239, 68, 68, ${0.25 + 0.75 * Math.min(1, cell.spent / max)})`,
                    }
                  : undefined
              }
              aria-label={money.formatLongDay(cell.date)}
            >
              {Number(cell.date.slice(8))}
            </button>
          ),
        )}
      </div>
      {!inHeatmapYear && heatmap.length > 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {fill(t.expenseAnalysis.heatmap.empty, { year: cursor.year })}
        </p>
      )}
      <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
        {t.expenseAnalysis.heatmap.less}
        {[0, 0.33, 0.66, 1].map(a => (
          <span
            key={a}
            className={cn("h-3 w-3 rounded-[3px]", a === 0 && "bg-muted")}
            style={
              a > 0
                ? { backgroundColor: `rgba(239, 68, 68, ${0.25 + 0.75 * a})` }
                : undefined
            }
          />
        ))}
        {t.expenseAnalysis.heatmap.more}
      </div>
    </div>
  )
}

/**
 * Mobile / narrow viewport view: stacked edge-to-edge cards (like the
 * dashboard on phones), scrollable range chips, 2×2 KPIs and tabs so each
 * chart gets the full ~360px width. Tap interactions replace hover/drag.
 */
export function ExpenseAnalysisMobile({ state }: Props) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const label = useCategoryLabel()
  const {
    range,
    brush,
    selectedDay,
    selectedCategory,
    selectedRanking,
    kpis,
    ranking,
    daily,
    rule,
    recurring,
    budgets,
    evolution,
    current,
    money,
    loading,
    error,
    hasAnyTransactions,
    hasConnectedSources,
    selectedEntity,
  } = state
  const [tab, setTab] = useState("overview")
  const categoryColor = selectedRanking?.color ?? CHART_EXPENSE_COLOR
  const hasDaily = daily.some(d => d.income !== 0 || d.expenses !== 0)

  const header = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t.expenseAnalysis.title}
        </h1>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => state.reload()}
          aria-label={t.expenseAnalysis.refresh}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>
      <AnalysisEntitySelector state={state} className="max-w-none" />
      <div className="-mx-6 overflow-x-auto no-scrollbar">
        <div className="flex w-max gap-2 px-6">
          {RANGE_PRESETS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() =>
                p === "custom" ? state.setRange(range) : state.setPreset(p)
              }
              className={cn(
                "h-9 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
                range.preset === p
                  ? "border-transparent bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400",
              )}
            >
              {t.expenseAnalysis.presets[p]}
            </button>
          ))}
        </div>
      </div>
      {range.preset === "custom" && <CustomRangeInputs state={state} />}
    </div>
  )

  if (!loading && !error && !hasAnyTransactions) {
    return (
      <div className="space-y-6">
        {header}
        <Card className={cn(PAGE_CARD_CLASS, "p-6")}>
          <div className="flex flex-col items-center py-6 text-center">
            <Wallet className="h-10 w-10 mb-3 text-muted-foreground opacity-60" />
            <h2 className="text-lg font-semibold">
              {hasConnectedSources
                ? t.expenseAnalysis.empty.forSourceTitle
                : t.expenseAnalysis.empty.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasConnectedSources
                ? fill(t.expenseAnalysis.empty.forSourceDescription, {
                    name: selectedEntity?.name ?? "",
                  })
                : t.expenseAnalysis.empty.description}
            </p>
            <Button
              className="mt-4 h-11 w-full"
              onClick={() => navigate("/entities")}
            >
              {t.expenseAnalysis.empty.goToIntegrations}
            </Button>
          </div>
        </Card>
        <CategorizerCard state={state} />
      </div>
    )
  }

  return (
    <motion.div
      variants={fadeListContainer}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <motion.div variants={fadeListItem}>{header}</motion.div>

      {(brush || selectedCategory) && (
        <motion.div variants={fadeListItem}>
          <Card className="flex items-center gap-2 px-3 py-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t.expenseAnalysis.activeView}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                {brush && (
                  <span>
                    {selectedDay
                      ? money.formatLongDay(selectedDay)
                      : fill(t.expenseAnalysis.fromTo, {
                          from: money.formatDay(brush.from),
                          to: money.formatDay(brush.to),
                        })}
                  </span>
                )}
                {selectedCategory && (
                  <span className="flex items-center gap-1.5">
                    <CategoryIcon category={selectedCategory} size="sm" />
                    {label(selectedCategory)}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={state.clearSelection}
              aria-label={t.expenseAnalysis.backToFullPeriod}
            >
              <X className="h-5 w-5" />
            </Button>
          </Card>
        </motion.div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-400/60 bg-red-100/70 dark:bg-red-900/30 px-3 py-2 text-sm text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{t.expenseAnalysis.loadError}</span>
        </div>
      )}

      {loading && !hasAnyTransactions ? (
        <div className="flex justify-center items-center h-[50vh]">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <motion.div
            variants={fadeListItem}
            className="grid grid-cols-2 gap-3"
          >
            <MobileKpi
              icon={TrendingUp}
              iconClass="text-green-500"
              label={t.expenseAnalysis.kpis.income}
              value={money.format(kpis.income.value)}
              delta={kpis.income.delta}
            />
            <MobileKpi
              icon={TrendingDown}
              iconClass="text-red-500"
              label={t.expenseAnalysis.kpis.expenses}
              value={money.format(kpis.expenses.value)}
              delta={kpis.expenses.delta}
              invert
            />
            <MobileKpi
              icon={PiggyBank}
              iconClass="text-violet-500"
              label={t.expenseAnalysis.kpis.savingsRate}
              value={money.formatPct(kpis.savingsRate.value, 1)}
              sub={
                <Sensitive className="text-muted-foreground">
                  {money.format(
                    kpis.savingsRate.savings + kpis.savingsRate.invested,
                  )}
                </Sensitive>
              }
            />
            <MobileKpi
              icon={Wallet}
              iconClass="text-blue-500"
              label={t.expenseAnalysis.kpis.avgDailySpend}
              value={money.format(kpis.avgDailySpend.value)}
              delta={kpis.avgDailySpend.delta}
              invert
            />
          </motion.div>

          <motion.div variants={fadeListItem}>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid h-11 w-full grid-cols-4">
                {(
                  ["overview", "categories", "calendar", "planning"] as const
                ).map(k => (
                  <TabsTrigger key={k} value={k} className="h-9 px-1 text-xs">
                    {t.expenseAnalysis.tabs[k]}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <MobileSection
                  title={
                    selectedCategory
                      ? `${t.expenseAnalysis.cashflow.title} · ${label(selectedCategory)}`
                      : t.expenseAnalysis.cashflow.title
                  }
                  icon={Activity}
                  subtitle={t.expenseAnalysis.cashflow.hintMobile}
                >
                  {!hasDaily ? (
                    <EmptyHint icon={Activity}>
                      {t.expenseAnalysis.noData}
                    </EmptyHint>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={daily}
                        margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                        barCategoryGap={1}
                        onClick={(s: any) => {
                          if (s?.activeLabel) {
                            const d = String(s.activeLabel)
                            state.selectDay(d === selectedDay ? null : d)
                          }
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_GRID_STROKE}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={money.formatDay}
                          tick={{ ...CHART_AXIS_TICK, fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={24}
                        />
                        <YAxis
                          tick={{ ...CHART_AXIS_TICK, fontSize: 10 }}
                          tickFormatter={money.formatChart}
                          tickLine={false}
                          axisLine={false}
                          width={56}
                        />
                        <Bar dataKey="expenses" radius={[2, 2, 0, 0]}>
                          {daily.map(d => (
                            <Cell
                              key={d.date}
                              fill={categoryColor}
                              opacity={
                                selectedDay && selectedDay !== d.date ? 0.3 : 1
                              }
                            />
                          ))}
                        </Bar>
                        <Bar
                          dataKey="income"
                          fill={CHART_INCOME_COLOR}
                          radius={[2, 2, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: categoryColor }}
                      />
                      {t.expenseAnalysis.cashflow.expense}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: CHART_INCOME_COLOR }}
                      />
                      {t.expenseAnalysis.cashflow.income}
                    </span>
                  </div>
                </MobileSection>

                {selectedDay && (
                  <MovementsList
                    state={state}
                    title={money.formatLongDay(selectedDay)}
                  />
                )}

                <MobileSection
                  title={t.expenseAnalysis.evolution.title}
                  icon={BarChart3}
                >
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={evolution}
                      margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={CHART_GRID_STROKE}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tickFormatter={money.formatMonth}
                        tick={{ ...CHART_AXIS_TICK, fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={16}
                      />
                      <YAxis
                        tick={{ ...CHART_AXIS_TICK, fontSize: 10 }}
                        tickFormatter={money.formatChart}
                        tickLine={false}
                        axisLine={false}
                        width={56}
                      />
                      <Bar
                        dataKey="income"
                        fill={CHART_INCOME_COLOR}
                        radius={[2, 2, 0, 0]}
                      />
                      <Bar
                        dataKey="expenses"
                        fill={CHART_EXPENSE_COLOR}
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </MobileSection>
              </TabsContent>

              <TabsContent value="categories" className="mt-4 space-y-4">
                <MobileSection
                  title={t.expenseAnalysis.distribution.title}
                  icon={ChartPie}
                  subtitle={t.expenseAnalysis.distribution.hintMobile}
                >
                  {ranking.length === 0 ? (
                    <EmptyHint icon={ChartPie}>
                      {t.expenseAnalysis.noExpenses}
                    </EmptyHint>
                  ) : (
                    <>
                      <div className="relative mx-auto h-[220px] w-full max-w-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={ranking}
                              dataKey="value"
                              nameKey="category"
                              innerRadius="62%"
                              outerRadius="95%"
                              paddingAngle={2}
                              stroke="hsl(var(--card))"
                              onClick={(entry: any) =>
                                state.toggleCategory(
                                  entry?.category ?? entry?.payload?.category,
                                )
                              }
                            >
                              {ranking.map(d => (
                                <Cell
                                  key={d.category}
                                  fill={d.color}
                                  opacity={
                                    selectedCategory &&
                                    selectedCategory !== d.category
                                      ? 0.25
                                      : 1
                                  }
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            {selectedCategory
                              ? label(selectedCategory)
                              : t.expenseAnalysis.kpis.expenses}
                          </span>
                          <span className="text-lg font-bold tabular-nums">
                            <Sensitive>
                              {money.format(
                                selectedRanking?.value ?? current.expenses,
                              )}
                            </Sensitive>
                          </span>
                        </div>
                      </div>
                      <ul className="mt-3 -mx-6 divide-y divide-border border-t">
                        {ranking.map(r => (
                          <li key={r.category}>
                            <button
                              type="button"
                              onClick={() => state.toggleCategory(r.category)}
                              className={cn(
                                "flex w-full items-center gap-3 px-6 py-3 text-left active:bg-accent",
                                selectedCategory === r.category && "bg-accent",
                              )}
                            >
                              <CategoryIcon category={r.category} size="lg" />
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <div className="flex items-center justify-between gap-2 text-sm">
                                  <span className="truncate font-medium">
                                    {label(r.category)}
                                  </span>
                                  <span className="font-semibold tabular-nums">
                                    <Sensitive>
                                      {money.format(r.value)}
                                    </Sensitive>
                                  </span>
                                </div>
                                <ProgressBar pct={r.pct} color={r.color} />
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span>
                                    {money.formatPct(r.pct)} ·{" "}
                                    {fill(t.expenseAnalysis.ranking.times, {
                                      n: r.count,
                                    })}
                                  </span>
                                  <DeltaBadge delta={r.delta} invert />
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </MobileSection>
                {selectedCategory && (
                  <MovementsList
                    state={state}
                    title={t.expenseAnalysis.movements.selection}
                  />
                )}
              </TabsContent>

              <TabsContent value="calendar" className="mt-4 space-y-4">
                <MobileSection
                  title={
                    selectedCategory
                      ? `${t.expenseAnalysis.heatmap.title} · ${label(selectedCategory)}`
                      : t.expenseAnalysis.heatmap.title
                  }
                  icon={CalendarDays}
                  subtitle={t.expenseAnalysis.cashflow.hintMobile}
                >
                  <MonthCalendarHeatmap state={state} />
                </MobileSection>
                {selectedDay && (
                  <MovementsList
                    state={state}
                    title={money.formatLongDay(selectedDay)}
                  />
                )}
              </TabsContent>

              <TabsContent value="planning" className="mt-4 space-y-4">
                <MobileSection
                  title={t.expenseAnalysis.rule.title}
                  icon={Scale}
                  subtitle={t.expenseAnalysis.rule.subtitle}
                >
                  <Rule503020Bars rule={rule} state={state} />
                </MobileSection>
                <MobileSection
                  title={t.expenseAnalysis.budgets.title}
                  icon={Target}
                  subtitle={t.expenseAnalysis.budgets.subtitle}
                >
                  <BudgetsEditor budgets={budgets} state={state} compact />
                </MobileSection>
                <MobileSection
                  title={t.expenseAnalysis.recurring.title}
                  icon={Repeat}
                  subtitle={t.expenseAnalysis.recurring.subtitle}
                >
                  <RecurringList
                    recurring={recurring}
                    state={state}
                    limit={8}
                  />
                </MobileSection>
                <MobileSection
                  title={t.expenseAnalysis.merchants.title}
                  icon={ShoppingBag}
                >
                  <MerchantsList state={state} limit={8} />
                </MobileSection>
                <MobileSection
                  title={t.expenseAnalysis.rules.title}
                  icon={Target}
                  subtitle={t.expenseAnalysis.rules.subtitle}
                >
            <CategorizerCard state={state} />
<div className="mt-6 border-t pt-6">
                    <CategorizerCard state={state} />
                  </div>
                </MobileSection>
              </TabsContent>
            </Tabs>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
