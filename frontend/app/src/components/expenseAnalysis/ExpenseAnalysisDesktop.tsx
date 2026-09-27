import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChartPie,
  ListOrdered,
  PiggyBank,
  RefreshCw,
  Repeat,
  Scale,
  ShoppingBag,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  WandSparkles,
  X,
} from "lucide-react"
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
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
import type { ExpenseAnalysisState } from "@/hooks/useExpenseAnalysis"
import { heatmapWeeks } from "@/utils/expenseAnalysis"
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
  RangePresetSegmented,
  RecurringList,
  Rule503020Bars,
  RulesEditor,
  fill,
  useCategoryLabel,
} from "./shared"

type Props = { state: ExpenseAnalysisState }

function SectionCard({
  title,
  icon: Icon,
  action,
  subtitle,
  children,
  className,
}: {
  title: string
  icon: typeof Activity
  action?: React.ReactNode
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn(PAGE_CARD_CLASS, className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-lg font-bold flex items-center">
            <Icon className="h-5 w-5 mr-2 text-primary shrink-0" />
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

function Kpi({
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
  const { t } = useI18n()
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className={cn("h-5 w-5", iconClass)} />
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold tabular-nums">
        <Sensitive>{value}</Sensitive>
      </div>
      <div className="mt-2 flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
        {delta !== undefined && (
          <DeltaBadge delta={delta ?? null} invert={invert} />
        )}
        <span className="truncate">
          {sub ?? (delta != null ? t.expenseAnalysis.kpis.vsPrevious : "")}
        </span>
      </div>
    </Card>
  )
}

function ChartTooltipBox({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: string; color: string }[]
}) {
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{title}</p>
      {rows.map(r => (
        <p key={r.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: r.color }}
            />
            {r.label}
          </span>
          <span className="font-medium tabular-nums">{r.value}</span>
        </p>
      ))}
    </div>
  )
}

function MovementsPanel({
  state,
  title,
  onClose,
}: {
  state: ExpenseAnalysisState
  title: string
  onClose: () => void
}) {
  const { t } = useI18n()
  const { selectionTxs, money, brush, openTransactions } = state
  const total = selectionTxs.reduce((s, tx) => s + tx.amount, 0)
  return (
    <div className="mt-4 rounded-lg border bg-muted/30 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
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
            className="text-xs px-2 py-1 h-auto min-h-0"
            onClick={() => openTransactions(brush ?? undefined)}
          >
            <ArrowRight className="h-3 w-3 mr-1" />
            {t.expenseAnalysis.movements.openInTransactions}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            aria-label={t.expenseAnalysis.movements.close}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {selectionTxs.length === 0 ? (
        <EmptyHint>{t.expenseAnalysis.movements.empty}</EmptyHint>
      ) : (
        <ul className="grid gap-x-8 divide-y divide-border xl:grid-cols-2 xl:divide-y-0">
          {selectionTxs.slice(0, 60).map(tx => (
            <MovementRow key={tx.id} tx={tx} state={state} />
          ))}
        </ul>
      )}
    </div>
  )
}

function YearHeatmap({ state }: Props) {
  const { t } = useI18n()
  const { heatmap, heatmapYear, selectedDay, brush, selectDay, money } = state
  const weeks = useMemo(
    () => heatmapWeeks(heatmap, heatmapYear),
    [heatmap, heatmapYear],
  )
  const max = useMemo(
    () => Math.max(1, ...heatmap.map(d => d.spent)),
    [heatmap],
  )
  const rangeBrush = brush && brush.from !== brush.to ? brush : null
  const inBrush = (d: string) =>
    !!rangeBrush && d >= rangeBrush.from && d <= rangeBrush.to
  const weekdayLabels = useMemo(() => {
    const monday = new Date(2024, 0, 1)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return i % 2 === 0
        ? d.toLocaleDateString(money.locale, { weekday: "narrow" })
        : ""
    })
  }, [money.locale])

  if (heatmap.length === 0) {
    return (
      <EmptyHint icon={CalendarDays}>
        {fill(t.expenseAnalysis.heatmap.empty, { year: heatmapYear })}
      </EmptyHint>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="flex w-fit gap-[3px]">
          <div className="mr-1 flex flex-col gap-[3px] text-[10px] text-muted-foreground">
            {weekdayLabels.map((l, i) => (
              <span key={i} className="h-[14px] leading-[14px]">
                {l}
              </span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) =>
                day === null ? (
                  <div key={di} className="h-[14px] w-[14px]" />
                ) : (
                  <button
                    key={di}
                    type="button"
                    onClick={() =>
                      selectDay(day.date === selectedDay ? null : day.date)
                    }
                    title={`${money.formatLongDay(day.date)} — ${
                      money.isPrivate
                        ? "••••"
                        : fill(t.expenseAnalysis.heatmap.spent, {
                            amount: money.format(day.spent),
                          })
                    }`}
                    className={cn(
                      "h-[14px] w-[14px] rounded-[3px] transition-transform hover:scale-125",
                      day.spent <= 0 && "bg-muted",
                      day.date === selectedDay &&
                        "ring-2 ring-primary scale-125",
                      inBrush(day.date) && "ring-1 ring-primary/60",
                    )}
                    style={{
                      backgroundColor:
                        day.spent > 0
                          ? `rgba(239, 68, 68, ${0.15 + 0.85 * Math.min(1, day.spent / max)})`
                          : undefined,
                      opacity: rangeBrush && !inBrush(day.date) ? 0.3 : 1,
                    }}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>{t.expenseAnalysis.heatmap.hint}</span>
        <span className="flex items-center gap-1">
          {t.expenseAnalysis.heatmap.less}
          {[0, 0.25, 0.5, 0.75, 1].map(a => (
            <span
              key={a}
              className={cn("h-3 w-3 rounded-[3px]", a === 0 && "bg-muted")}
              style={
                a > 0
                  ? { backgroundColor: `rgba(239, 68, 68, ${0.15 + 0.85 * a})` }
                  : undefined
              }
            />
          ))}
          {t.expenseAnalysis.heatmap.more}
        </span>
      </div>
    </div>
  )
}

/**
 * Desktop / wide viewport view. Mirrors Ledger's "Análisis" information
 * architecture, rendered with Finanze's cards, typography and chart styling.
 */
export function ExpenseAnalysisDesktop({ state }: Props) {
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
  } = state

  const [dragStart, setDragStart] = useState<string | null>(null)
  const [dragHover, setDragHover] = useState<string | null>(null)
  const [showSelection, setShowSelection] = useState(false)

  const finishDrag = useCallback(() => {
    if (!dragStart) return
    const end = dragHover ?? dragStart
    state.selectBrush(dragStart, end)
    setDragStart(null)
    setDragHover(null)
  }, [dragStart, dragHover, state])

  const categoryColor = selectedRanking?.color ?? CHART_EXPENSE_COLOR
  const hasDaily = daily.some(d => d.income !== 0 || d.expenses !== 0)

  const header = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold flex-shrink-0 whitespace-nowrap">
          {t.expenseAnalysis.title}
        </h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <RangePresetSegmented
            value={range.preset}
            onChange={p =>
              p === "custom" ? state.setRange(range) : state.setPreset(p)
            }
          />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => state.reload()}
            aria-label={t.expenseAnalysis.refresh}
            title={t.expenseAnalysis.refresh}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>
      {range.preset === "custom" && (
        <CustomRangeInputs state={state} className="max-w-md ml-auto" />
      )}
    </div>
  )

  if (!loading && !error && !hasAnyTransactions) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Wallet className="h-10 w-10 mb-3 text-muted-foreground opacity-60" />
            <h2 className="text-lg font-semibold">
              {t.expenseAnalysis.empty.title}
            </h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              {t.expenseAnalysis.empty.description}
            </p>
            <Button className="mt-4" onClick={() => navigate("/entities")}>
              {t.expenseAnalysis.empty.goToIntegrations}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      variants={fadeListContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={fadeListItem}>{header}</motion.div>

      {(brush || selectedCategory) && (
        <motion.div variants={fadeListItem}>
          <Card className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t.expenseAnalysis.activeView}
            </span>
            {brush && (
              <span className="text-sm font-medium">
                {selectedDay
                  ? fill(t.expenseAnalysis.day, {
                      day: money.formatLongDay(selectedDay),
                    })
                  : fill(t.expenseAnalysis.fromTo, {
                      from: money.formatDay(brush.from),
                      to: money.formatDay(brush.to),
                    })}
              </span>
            )}
            {selectedCategory && (
              <span className="flex items-center gap-2 text-sm">
                <CategoryIcon category={selectedCategory} size="sm" />
                <span className="font-medium">{label(selectedCategory)}</span>
                {selectedRanking && (
                  <span className="text-muted-foreground tabular-nums">
                    <Sensitive className="text-muted-foreground">
                      {money.format(selectedRanking.value)}
                    </Sensitive>{" "}
                    · {money.formatPct(selectedRanking.pct)}
                  </span>
                )}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-xs px-2 py-1 h-auto min-h-0"
              onClick={() => setShowSelection(s => !s)}
            >
              <ListOrdered className="h-3 w-3 mr-1" />
              {t.expenseAnalysis.movements.selection}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs"
              onClick={() => {
                state.clearSelection()
                setShowSelection(false)
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {t.expenseAnalysis.backToFullPeriod}
            </Button>
          </Card>
          {showSelection && !selectedDay && (
            <MovementsPanel
              state={state}
              title={t.expenseAnalysis.movements.selection}
              onClose={() => setShowSelection(false)}
            />
          )}
        </motion.div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-400/60 bg-red-100/70 dark:bg-red-900/30 px-3 py-2.5 text-sm text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>
            {t.expenseAnalysis.loadError}: {error}
          </span>
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
            className="grid grid-cols-2 gap-4 xl:grid-cols-4"
          >
            <Kpi
              icon={TrendingUp}
              iconClass="text-green-500"
              label={t.expenseAnalysis.kpis.income}
              value={money.format(kpis.income.value)}
              delta={kpis.income.delta}
            />
            <Kpi
              icon={TrendingDown}
              iconClass="text-red-500"
              label={t.expenseAnalysis.kpis.expenses}
              value={money.format(kpis.expenses.value)}
              delta={kpis.expenses.delta}
              invert
            />
            <Kpi
              icon={PiggyBank}
              iconClass="text-violet-500"
              label={t.expenseAnalysis.kpis.savingsRate}
              value={money.formatPct(kpis.savingsRate.value, 1)}
              sub={
                <Sensitive className="text-muted-foreground">
                  {fill(t.expenseAnalysis.kpis.savingsRateSub, {
                    saved: money.format(kpis.savingsRate.savings),
                    invested: money.format(kpis.savingsRate.invested),
                  })}
                </Sensitive>
              }
            />
            <Kpi
              icon={Wallet}
              iconClass="text-blue-500"
              label={t.expenseAnalysis.kpis.avgDailySpend}
              value={money.format(kpis.avgDailySpend.value)}
              delta={kpis.avgDailySpend.delta}
              invert
            />
          </motion.div>

          <motion.div variants={fadeListItem}>
            <SectionCard
              title={
                selectedCategory
                  ? `${t.expenseAnalysis.cashflow.title} — ${label(selectedCategory)}`
                  : t.expenseAnalysis.cashflow.title
              }
              icon={Activity}
              subtitle={t.expenseAnalysis.cashflow.hintDesktop}
            >
              {!hasDaily ? (
                <EmptyHint icon={Activity}>
                  {t.expenseAnalysis.noData}
                </EmptyHint>
              ) : (
                <div
                  className="select-none"
                  onMouseUp={finishDrag}
                  onMouseLeave={() => dragStart && finishDrag()}
                >
                  <ResponsiveContainer width="100%" height={340}>
                    <ComposedChart
                      data={daily}
                      margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
                      className="cursor-crosshair"
                      onMouseDown={(s: any) => {
                        const d = s?.activeLabel
                        if (d) {
                          setDragStart(String(d))
                          setDragHover(String(d))
                        }
                      }}
                      onMouseMove={(s: any) => {
                        if (dragStart && s?.activeLabel)
                          setDragHover(String(s.activeLabel))
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
                        tick={CHART_AXIS_TICK}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                      />
                      <YAxis
                        tick={CHART_AXIS_TICK}
                        tickFormatter={money.formatChart}
                        tickLine={false}
                        axisLine={false}
                        width={64}
                      />
                      <Tooltip
                        content={({ active, payload, label: l }) =>
                          active && payload?.length ? (
                            <ChartTooltipBox
                              title={money.formatLongDay(String(l))}
                              rows={[
                                {
                                  label: t.expenseAnalysis.cashflow.expense,
                                  value: money.isPrivate
                                    ? "••••"
                                    : money.format(
                                        Number(payload[0].payload.expenses),
                                      ),
                                  color: categoryColor,
                                },
                                {
                                  label: t.expenseAnalysis.cashflow.income,
                                  value: money.isPrivate
                                    ? "••••"
                                    : money.format(
                                        Number(payload[0].payload.income),
                                      ),
                                  color: CHART_INCOME_COLOR,
                                },
                              ]}
                            />
                          ) : null
                        }
                      />
                      <ReferenceLine y={0} stroke={CHART_GRID_STROKE} />
                      {brush && !selectedDay && (
                        <ReferenceArea
                          x1={brush.from}
                          x2={brush.to}
                          fill="hsl(var(--primary))"
                          fillOpacity={0.06}
                        />
                      )}
                      {selectedDay && (
                        <ReferenceLine
                          x={selectedDay}
                          stroke="hsl(var(--primary))"
                          strokeDasharray="4 4"
                        />
                      )}
                      {dragStart && dragHover && dragStart !== dragHover && (
                        <ReferenceArea
                          x1={dragStart <= dragHover ? dragStart : dragHover}
                          x2={dragStart <= dragHover ? dragHover : dragStart}
                          fill="hsl(var(--primary))"
                          fillOpacity={0.12}
                        />
                      )}
                      <Bar
                        dataKey="income"
                        fill={CHART_INCOME_COLOR}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={14}
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        stroke={categoryColor}
                        fill={categoryColor}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
              {selectedDay && (
                <MovementsPanel
                  state={state}
                  title={money.formatLongDay(selectedDay)}
                  onClose={state.clearBrush}
                />
              )}
            </SectionCard>
          </motion.div>

          <motion.div
            variants={fadeListItem}
            className="grid gap-6 lg:grid-cols-2"
          >
            <SectionCard
              title={t.expenseAnalysis.distribution.title}
              icon={ChartPie}
            >
              {ranking.length === 0 ? (
                <EmptyHint icon={ChartPie}>
                  {t.expenseAnalysis.noExpenses}
                </EmptyHint>
              ) : (
                <>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={ranking}
                          dataKey="value"
                          nameKey="category"
                          innerRadius="58%"
                          outerRadius="88%"
                          paddingAngle={2}
                          stroke="hsl(var(--card))"
                          onClick={(entry: any) =>
                            state.toggleCategory(
                              entry?.category ?? entry?.payload?.category,
                            )
                          }
                          className="cursor-pointer"
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
                        <Tooltip
                          content={({ active, payload }) =>
                            active && payload?.length ? (
                              <ChartTooltipBox
                                title={label(payload[0].payload.category)}
                                rows={[
                                  {
                                    label: money.formatPct(
                                      payload[0].payload.pct,
                                    ),
                                    value: money.isPrivate
                                      ? "••••"
                                      : money.format(
                                          Number(payload[0].payload.value),
                                        ),
                                    color: payload[0].payload.color,
                                  },
                                ]}
                              />
                            ) : null
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground">
                        {selectedCategory
                          ? label(selectedCategory)
                          : t.expenseAnalysis.kpis.expenses}
                      </span>
                      <span className="text-xl font-bold tabular-nums">
                        <Sensitive>
                          {money.format(
                            selectedRanking?.value ?? current.expenses,
                          )}
                        </Sensitive>
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
                    {ranking.map(d => (
                      <button
                        key={d.category}
                        type="button"
                        onClick={() => state.toggleCategory(d.category)}
                        className={cn(
                          "flex items-center gap-1.5 text-xs transition-opacity",
                          selectedCategory && selectedCategory !== d.category
                            ? "opacity-40"
                            : "opacity-100",
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        {label(d.category)}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {t.expenseAnalysis.distribution.hint}
                  </p>
                </>
              )}
            </SectionCard>

            <SectionCard
              title={t.expenseAnalysis.ranking.title}
              icon={BarChart3}
              action={
                <span className="text-xs text-muted-foreground">
                  <Sensitive className="text-muted-foreground">
                    {fill(t.expenseAnalysis.ranking.total, {
                      amount: money.format(current.expenses),
                    })}
                  </Sensitive>
                </span>
              }
            >
              {ranking.length === 0 ? (
                <EmptyHint icon={BarChart3}>
                  {t.expenseAnalysis.noExpenses}
                </EmptyHint>
              ) : (
                <div className="space-y-1">
                  {ranking.slice(0, 10).map(r => (
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
                </div>
              )}
            </SectionCard>
          </motion.div>

          <motion.div
            variants={fadeListItem}
            className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3"
          >
            <SectionCard
              title={t.expenseAnalysis.rule.title}
              icon={Scale}
              subtitle={t.expenseAnalysis.rule.subtitle}
            >
              <Rule503020Bars rule={rule} state={state} />
            </SectionCard>
            <SectionCard
              title={t.expenseAnalysis.recurring.title}
              icon={Repeat}
              subtitle={t.expenseAnalysis.recurring.subtitle}
            >
              <RecurringList recurring={recurring} state={state} />
            </SectionCard>
            <SectionCard
              className="lg:col-span-2 2xl:col-span-1"
              title={t.expenseAnalysis.budgets.title}
              icon={Target}
              subtitle={t.expenseAnalysis.budgets.subtitle}
            >
              <BudgetsEditor budgets={budgets} state={state} />
            </SectionCard>
          </motion.div>

          <motion.div variants={fadeListItem}>
            <SectionCard
              title={
                selectedCategory
                  ? `${t.expenseAnalysis.heatmap.title} — ${label(selectedCategory)}`
                  : `${t.expenseAnalysis.heatmap.title} · ${state.heatmapYear}`
              }
              icon={CalendarDays}
            >
              <YearHeatmap state={state} />
            </SectionCard>
          </motion.div>

          <motion.div
            variants={fadeListItem}
            className="grid gap-6 lg:grid-cols-2"
          >
            <SectionCard
              title={t.expenseAnalysis.evolution.title}
              icon={BarChart3}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={evolution}
                  margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_GRID_STROKE}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tickFormatter={money.formatMonth}
                    tick={CHART_AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={CHART_AXIS_TICK}
                    tickFormatter={money.formatChart}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                    content={({ active, payload, label: l }) =>
                      active && payload?.length ? (
                        <ChartTooltipBox
                          title={money.formatMonth(String(l))}
                          rows={[
                            {
                              label: t.expenseAnalysis.kpis.income,
                              value: money.isPrivate
                                ? "••••"
                                : money.format(
                                    Number(payload[0].payload.income),
                                  ),
                              color: CHART_INCOME_COLOR,
                            },
                            {
                              label: t.expenseAnalysis.kpis.expenses,
                              value: money.isPrivate
                                ? "••••"
                                : money.format(
                                    Number(payload[0].payload.expenses),
                                  ),
                              color: CHART_EXPENSE_COLOR,
                            },
                          ]}
                        />
                      ) : null
                    }
                  />
                  <Bar
                    dataKey="income"
                    fill={CHART_INCOME_COLOR}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    fill={CHART_EXPENSE_COLOR}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
            <SectionCard
              title={t.expenseAnalysis.merchants.title}
              icon={ShoppingBag}
            >
              <MerchantsList state={state} />
            </SectionCard>
          </motion.div>

          <motion.div variants={fadeListItem}>
            <SectionCard
              title={t.expenseAnalysis.rules.title}
              icon={WandSparkles}
              subtitle={t.expenseAnalysis.rules.subtitle}
            >
              <RulesEditor state={state} />
            </SectionCard>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
