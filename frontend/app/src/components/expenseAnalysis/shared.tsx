/**
 * Small presentational building blocks shared by ExpenseAnalysisDesktop and
 * ExpenseAnalysisMobile. They only use Finanze's UI kit (Card, Button,
 * Input, DatePicker, Sensitive, Badge…), theme tokens and lucide icons, and
 * never compute analysis data themselves (that lives in useExpenseAnalysis).
 */
import { useMemo, useState, type ReactNode } from "react"
import {
  ArrowLeftRight,
  Briefcase,
  Car,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Coins,
  Dumbbell,
  Eye,
  EyeOff,
  Gamepad2,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Lightbulb,
  PawPrint,
  Percent,
  Plane,
  Plus,
  Scissors,
  Shield,
  Sparkles,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Split,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"
const SplitIcon = Split
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { DatePicker } from "@/components/ui/DatePicker"
import { Sensitive } from "@/components/ui/Sensitive"
import { Badge } from "@/components/ui/Badge"
import type {
  AnalysisTx,
  BudgetStatus,
  ExpenseCategoryId,
  ExpenseSplitPart,
  RangePreset,
  RecurringResult,
} from "@/types/expenseAnalysis"
import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  RANGE_PRESETS,
  getCategory,
} from "@/utils/expenseAnalysis"
import type { ExpenseAnalysisState } from "@/hooks/useExpenseAnalysis"

export const CHART_INCOME_COLOR = "#22c55e"
export const CHART_EXPENSE_COLOR = "#ef4444"
export const CHART_AXIS_TICK = {
  fontSize: 11,
  fill: "hsl(var(--muted-foreground))",
}
export const CHART_GRID_STROKE = "hsl(var(--border))"

export const PAGE_CARD_CLASS =
  "-mx-6 md:mx-0 rounded-none md:rounded-lg border-x-0 md:border-x"

export const SELECT_CLASS =
  "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const CATEGORY_ICONS: Record<ExpenseCategoryId, LucideIcon> = {
  salary: Briefcase,
  otherIncome: Coins,
  bizumReceived: HandCoins,
  interest: Percent,
  housing: House,
  utilities: Lightbulb,
  groceries: ShoppingCart,
  restaurants: UtensilsCrossed,
  transport: Car,
  subscriptions: Repeat,
  leisure: Gamepad2,
  health: HeartPulse,
  shopping: ShoppingBag,
  familyFriends: Users,
  sports: Dumbbell,
  travel: Plane,
  beauty: Scissors,
  softwareAi: Sparkles,
  education: GraduationCap,
  pets: PawPrint,
  insurance: Shield,
  cashWithdrawal: Wallet,
  fees: Receipt,
  uncategorized: CircleHelp,
  ownTransfer: ArrowLeftRight,
  savingsInvestment: TrendingUp,
}

export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (acc, [k, v]) => acc.split(`{${k}}`).join(String(v)),
    template,
  )
}

export function useCategoryLabel() {
  const { t } = useI18n()
  return (id: ExpenseCategoryId) =>
    (t.expenseAnalysis.categories as Record<string, string>)[id] ??
    CATEGORY_LABELS[id] ??
    id
}

export function CategoryIcon({
  category,
  size = "md",
}: {
  category: ExpenseCategoryId
  size?: "sm" | "md" | "lg"
}) {
  const Icon = CATEGORY_ICONS[category] ?? CircleHelp
  const color = getCategory(category).color
  const box =
    size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-8 w-8"
  const icon =
    size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        box,
      )}
      style={{ backgroundColor: `${color}22`, color }}
    >
      <Icon className={icon} />
    </span>
  )
}

export function DeltaBadge({
  delta,
  invert = false,
  className,
}: {
  delta: number | null
  invert?: boolean
  className?: string
}) {
  if (delta == null || !isFinite(delta)) return null
  const good = invert ? delta <= 0 : delta >= 0
  const Icon = delta >= 0 ? ChevronUp : ChevronDown
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        good
          ? "text-green-600 dark:text-green-400"
          : "text-red-600 dark:text-red-400",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {Math.abs(delta).toFixed(1)}%
    </span>
  )
}

export function ProgressBar({
  pct,
  color,
  thresholds = false,
  marker,
  className,
}: {
  pct: number
  color: string
  thresholds?: boolean
  marker?: number
  className?: string
}) {
  const barColor = thresholds
    ? pct > 100
      ? "#ef4444"
      : pct > 80
        ? "#f59e0b"
        : color
    : color
  return (
    <div
      className={cn("relative h-2 rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          backgroundColor: barColor,
        }}
      />
      {marker !== undefined && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 rounded bg-foreground/60"
          style={{ left: `${marker}%` }}
        />
      )}
    </div>
  )
}

export function EmptyHint({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon
  children: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-muted-foreground">
      {Icon && <Icon className="h-8 w-8 mb-2 opacity-60" />}
      <p>{children}</p>
    </div>
  )
}

export function RangePresetSegmented({
  value,
  onChange,
  className,
}: {
  value: RangePreset
  onChange: (preset: RangePreset) => void
  className?: string
}) {
  const { t } = useI18n()
  return (
    <div
      className={cn(
        "flex h-9 items-center rounded-md border border-gray-200 dark:border-gray-700 p-1",
        className,
      )}
    >
      {RANGE_PRESETS.map(p => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "flex h-full items-center rounded px-2.5 text-sm font-medium whitespace-nowrap transition-colors",
            value === p
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
          )}
        >
          {t.expenseAnalysis.presets[p]}
        </button>
      ))}
    </div>
  )
}

export function CustomRangeInputs({
  state,
  className,
}: {
  state: ExpenseAnalysisState
  className?: string
}) {
  const { t } = useI18n()
  const { range, setRange } = state
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <DatePicker
        value={range.from}
        onChange={from =>
          setRange({ from, to: range.to < from ? from : range.to })
        }
        placeholder={t.expenseAnalysis.from}
      />
      <DatePicker
        value={range.to}
        onChange={to =>
          setRange({ from: range.from > to ? to : range.from, to })
        }
        placeholder={t.expenseAnalysis.to}
      />
    </div>
  )
}

export { Rule503020Bars } from "./Rule503020Bars"

export function RecurringList({
  recurring,
  state,
  limit = 10,
}: {
  recurring: RecurringResult
  state: ExpenseAnalysisState
  limit?: number
}) {
  const { t } = useI18n()
  const label = useCategoryLabel()
  const { money, recurringMonths } = state
  if (recurring.items.length === 0) {
    return (
      <EmptyHint icon={Repeat}>
        {fill(t.expenseAnalysis.recurring.empty, { months: recurringMonths })}
      </EmptyHint>
    )
  }
  return (
    <div className="space-y-3">
      <div>
        <div className="text-2xl font-bold tabular-nums">
          <Sensitive>{money.format(recurring.monthlyTotal)}</Sensitive>
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {t.expenseAnalysis.recurring.perMonth}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {fill(t.expenseAnalysis.recurring.description, {
            months: recurringMonths,
          })}
        </p>
      </div>
      <ul className="divide-y divide-border">
        {recurring.items.slice(0, limit).map(r => (
          <li key={r.concept} className="flex items-center gap-3 py-2.5">
            <CategoryIcon category={r.category} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={r.concept}>
                {r.concept}
              </p>
              <p className="text-xs text-muted-foreground">
                {label(r.category)}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {fill(t.expenseAnalysis.recurring.months, { n: r.monthsSeen })}
            </Badge>
            <span className="text-sm font-semibold tabular-nums">
              <Sensitive>{money.format(r.avgAmount)}</Sensitive>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export type BudgetMode = "real" | "plan"

export function BudgetsEditor({
  budgets,
  state,
  compact = false,
  initialMode = "real",
}: {
  budgets: BudgetStatus[]
  state: ExpenseAnalysisState
  compact?: boolean
  initialMode?: BudgetMode
}) {
  const { t } = useI18n()
  const label = useCategoryLabel()
  const { money, configApi } = state
  const [mode, setMode] = useState<BudgetMode>(initialMode)

  // ─── Real mode: legacy behaviour, untouched ────────────────────────────────
  const [category, setCategory] = useState<string>("")
  const [amount, setAmount] = useState("")
  const available = EXPENSE_CATEGORIES.filter(
    c => c.group === "expense" && !budgets.some(b => b.category === c.id),
  )

  const add = async () => {
    const value = Number(amount)
    if (!category || !amount || !(value >= 0)) return
    await configApi.setBudget(category as ExpenseCategoryId, value)
    setCategory("")
    setAmount("")
  }

  // ─── Plan mode: independent forms for income + expense ────────────────────
  const { config } = configApi
  const planBudgets = config.planBudgets ?? []
  const planIncomes = config.planIncomes ?? []

  const [pIncomeCat, setPIncomeCat] = useState<string>("")
  const [pIncomeAmt, setPIncomeAmt] = useState("")
  const incomeAvailable = EXPENSE_CATEGORIES.filter(
    c => c.group === "income" && !planIncomes.some(b => b.category === c.id),
  )

  const [pExpCat, setPExpCat] = useState<string>("")
  const [pExpAmt, setPExpAmt] = useState("")
  const expAvailable = EXPENSE_CATEGORIES.filter(
    c => c.group === "expense" && !planBudgets.some(b => b.category === c.id),
  )

  const addPlanIncome = async () => {
    const v = Number(pIncomeAmt)
    if (!pIncomeCat || !pIncomeAmt || !(v >= 0)) return
    await configApi.setPlanIncome(pIncomeCat as ExpenseCategoryId, v)
    setPIncomeCat("")
    setPIncomeAmt("")
  }

  const addPlanExpense = async () => {
    const v = Number(pExpAmt)
    if (!pExpCat || !pExpAmt || !(v >= 0)) return
    await configApi.setPlanBudget(pExpCat as ExpenseCategoryId, v)
    setPExpCat("")
    setPExpAmt("")
  }

  const totalIncome = planIncomes.reduce((s, b) => s + b.amount, 0)
  const totalExpenses = planBudgets.reduce((s, b) => s + b.amount, 0)
  const savings = totalIncome - totalExpenses
  const savingsPct =
    totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0

  // ─── Pill switch ──────────────────────────────────────────────────────────
  const Pill = (
    <div className="inline-flex h-8 items-center rounded-full border border-border bg-muted p-0.5 text-xs">
      {(["real", "plan"] as BudgetMode[]).map(m => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className={cn(
            "h-7 rounded-full px-3 font-medium transition-colors",
            mode === m
              ? "bg-foreground text-background shadow"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {m === "real"
            ? t.expenseAnalysis.budgets.modeReal
            : t.expenseAnalysis.budgets.modePlan}
        </button>
      ))}
    </div>
  )

  // If the parent (SectionCard action) doesn't consume the pill, render it
  // ourselves so the user can still toggle. This keeps Desktop/Mobile callers
  // backward-compatible — they can opt-in to the action slot if they want it
  // in the card header.
  return (
    <div className="space-y-4">
      {mode === "real" ? (
        <>
          <div className="flex items-center justify-end">{Pill}</div>
          <BudgetRealMode
            budgets={budgets}
            category={category}
            setCategory={setCategory}
            amount={amount}
            setAmount={setAmount}
            available={available}
            label={label}
            money={money}
            compact={compact}
            onAdd={add}
            onRemove={cat => configApi.removeBudget(cat)}
            t={t.expenseAnalysis.budgets}
          />
        </>
      ) : (
        <BudgetPlanMode
          money={money}
          label={label}
          compact={compact}
          pill={Pill}
          planIncomes={planIncomes}
          planBudgets={planBudgets}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          savings={savings}
          savingsPct={savingsPct}
          incomeAvailable={incomeAvailable}
          expAvailable={expAvailable}
          pIncomeCat={pIncomeCat}
          setPIncomeCat={setPIncomeCat}
          pIncomeAmt={pIncomeAmt}
          setPIncomeAmt={setPIncomeAmt}
          pExpCat={pExpCat}
          setPExpCat={setPExpCat}
          pExpAmt={pExpAmt}
          setPExpAmt={setPExpAmt}
          onAddPlanIncome={addPlanIncome}
          onAddPlanExpense={addPlanExpense}
          onRemoveIncome={cat => configApi.removePlanIncome(cat)}
          onRemoveExpense={cat => configApi.removePlanBudget(cat)}
          t={t.expenseAnalysis.budgets}
        />
      )}
    </div>
  )
}

function BudgetRealMode({
  budgets,
  category,
  setCategory,
  amount,
  setAmount,
  available,
  label,
  money,
  compact,
  onAdd,
  onRemove,
  t,
}: {
  budgets: BudgetStatus[]
  category: string
  setCategory: (s: string) => void
  amount: string
  setAmount: (s: string) => void
  available: { id: ExpenseCategoryId }[]
  label: (id: ExpenseCategoryId) => string
  money: {
    format: (n: number) => string
    currency: string
  }
  compact: boolean
  onAdd: () => void
  onRemove: (cat: ExpenseCategoryId) => void
  t: Record<string, string>
}) {
  return (
    <>
      <div className={cn("flex gap-2", compact && "flex-col")}>
        <select
          aria-label={t.category}
          value={category}
          onChange={e => setCategory(e.target.value)}
          className={cn(SELECT_CLASS, !compact && "flex-1", compact && "h-11")}
        >
          <option value="">{t.category}…</option>
          {available.map(c => (
            <option key={c.id} value={c.id}>
              {label(c.id)}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="10"
            placeholder={`${t.amount} (${money.currency})`}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className={cn(compact ? "h-11 flex-1" : "w-32")}
          />
          <Button
            onClick={onAdd}
            disabled={!category || !amount}
            className={cn(compact && "h-11")}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t.add}
          </Button>
        </div>
      </div>
      {budgets.length === 0 ? (
        <EmptyHint>{t.empty}</EmptyHint>
      ) : (
        <ul className="space-y-3">
          {budgets.map(b => (
            <li key={b.category} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <CategoryIcon category={b.category} size="sm" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {label(b.category)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  <Sensitive className="text-foreground font-semibold">
                    {money.format(b.spent)}
                  </Sensitive>{" "}
                  /{" "}
                  <Sensitive className="text-muted-foreground">
                    {money.format(b.budget)}
                  </Sensitive>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(compact ? "h-10 w-10" : "h-7 w-7")}
                  aria-label={t.remove}
                  onClick={() => onRemove(b.category)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ProgressBar pct={b.pct} color={b.color} thresholds />
              {b.budget !== b.monthlyBudget && b.monthlyBudget > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  <Sensitive className="text-muted-foreground">
                    {fill(t.periodHint, {
                      amount: money.format(b.monthlyBudget),
                      months: Math.round(b.budget / b.monthlyBudget),
                    })}
                  </Sensitive>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {budgets.length > 0 && (
        <div className="flex items-center justify-between border-t pt-3 text-sm font-medium">
          <span>Total presupuesto / gastado</span>
          <span className="tabular-nums">
            <Sensitive className="text-muted-foreground">
              {money.format(budgets.reduce((s, b) => s + b.budget, 0))}
            </Sensitive>
            {" / "}
            <Sensitive>
              {money.format(budgets.reduce((s, b) => s + b.spent, 0))}
            </Sensitive>
          </span>
        </div>
      )}
    </>
  )
}

function BudgetPlanMode({
  money,
  label,
  compact,
  pill,
  planIncomes,
  planBudgets,
  totalIncome,
  totalExpenses,
  savings,
  savingsPct,
  incomeAvailable,
  expAvailable,
  pIncomeCat,
  setPIncomeCat,
  pIncomeAmt,
  setPIncomeAmt,
  pExpCat,
  setPExpCat,
  pExpAmt,
  setPExpAmt,
  onAddPlanIncome,
  onAddPlanExpense,
  onRemoveIncome,
  onRemoveExpense,
  t,
}: {
  money: {
    format: (n: number) => string
    currency: string
  }
  label: (id: ExpenseCategoryId) => string
  compact: boolean
  pill: React.ReactNode
  planIncomes: { category: ExpenseCategoryId; amount: number }[]
  planBudgets: { category: ExpenseCategoryId; amount: number }[]
  totalIncome: number
  totalExpenses: number
  savings: number
  savingsPct: number
  incomeAvailable: { id: ExpenseCategoryId }[]
  expAvailable: { id: ExpenseCategoryId }[]
  pIncomeCat: string
  setPIncomeCat: (s: string) => void
  pIncomeAmt: string
  setPIncomeAmt: (s: string) => void
  pExpCat: string
  setPExpCat: (s: string) => void
  pExpAmt: string
  setPExpAmt: (s: string) => void
  onAddPlanIncome: () => void
  onAddPlanExpense: () => void
  onRemoveIncome: (cat: ExpenseCategoryId) => void
  onRemoveExpense: (cat: ExpenseCategoryId) => void
  t: Record<string, string>
}) {
  const summary =
    savings >= 0
      ? fill(t.planSummary, {
          income: money.format(totalIncome),
          expenses: money.format(totalExpenses),
          savings: money.format(savings),
          pct: String(savingsPct),
        })
      : fill(t.planSummaryDeficit, {
          income: money.format(totalIncome),
          expenses: money.format(totalExpenses),
          deficit: money.format(-savings),
        })

  const renderRow = (
    b: { category: ExpenseCategoryId; amount: number },
    onRemove: (cat: ExpenseCategoryId) => void,
  ) => {
    const pctOfIncome =
      totalIncome > 0 ? (b.amount / totalIncome) * 100 : null
    return (
      <li key={b.category} className="flex items-center gap-2 py-1.5">
        <CategoryIcon category={b.category} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {label(b.category)}
        </span>
        <span className="text-sm tabular-nums">
          <Sensitive>{money.format(b.amount)}</Sensitive>
        </span>
        {pctOfIncome !== null && (
          <span className="w-16 text-right text-[11px] tabular-nums text-muted-foreground">
            {fill(t.planPctOfIncome, {
              pct: Math.round(pctOfIncome).toString(),
            })}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(compact ? "h-10 w-10" : "h-7 w-7")}
          aria-label={t.remove}
          onClick={() => onRemove(b.category)}
        >
          <X className="h-4 w-4" />
        </Button>
      </li>
    )
  }

  return (
    <>
      <div className="flex items-center justify-end">{pill}</div>

      {(planIncomes.length > 0 || planBudgets.length > 0) && (
        <div
          className={cn(
            "rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm",
            savings < 0 && "border-red-400/60 bg-red-50/40 dark:bg-red-950/20",
          )}
        >
          <Sensitive>{summary}</Sensitive>
        </div>
      )}

      <div
        className={cn(
          "grid gap-4",
          compact ? "grid-cols-1" : "md:grid-cols-2",
        )}
      >
        {/* Ingresos planeados */}
        <section className="space-y-2">
          <h4 className="text-sm font-semibold">{t.planIncomes}</h4>
          <div className={cn("flex gap-2", compact && "flex-col")}>
            <select
              aria-label={t.planIncomePlaceholder}
              value={pIncomeCat}
              onChange={e => setPIncomeCat(e.target.value)}
              className={cn(
                SELECT_CLASS,
                !compact && "flex-1",
                compact && "h-11",
              )}
            >
              <option value="">{t.planIncomePlaceholder}…</option>
              {incomeAvailable.map(c => (
                <option key={c.id} value={c.id}>
                  {label(c.id)}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="50"
                placeholder={`${t.amount} (${money.currency})`}
                value={pIncomeAmt}
                onChange={e => setPIncomeAmt(e.target.value)}
                className={cn(compact ? "h-11 flex-1" : "w-32")}
              />
              <Button
                onClick={onAddPlanIncome}
                disabled={!pIncomeCat || !pIncomeAmt}
                className={cn(compact && "h-11")}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t.add}
              </Button>
            </div>
          </div>
          {planIncomes.length === 0 ? (
            <EmptyHint>{t.planIncomesEmpty}</EmptyHint>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border/60 bg-card/30">
              {planIncomes.map(b => renderRow(b, onRemoveIncome))}
            </ul>
          )}
        </section>

        {/* Gastos planeados */}
        <section className="space-y-2">
          <h4 className="text-sm font-semibold">{t.planExpenses}</h4>
          <div className={cn("flex gap-2", compact && "flex-col")}>
            <select
              aria-label={t.category}
              value={pExpCat}
              onChange={e => setPExpCat(e.target.value)}
              className={cn(
                SELECT_CLASS,
                !compact && "flex-1",
                compact && "h-11",
              )}
            >
              <option value="">{t.category}…</option>
              {expAvailable.map(c => (
                <option key={c.id} value={c.id}>
                  {label(c.id)}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="10"
                placeholder={`${t.amount} (${money.currency})`}
                value={pExpAmt}
                onChange={e => setPExpAmt(e.target.value)}
                className={cn(compact ? "h-11 flex-1" : "w-32")}
              />
              <Button
                onClick={onAddPlanExpense}
                disabled={!pExpCat || !pExpAmt}
                className={cn(compact && "h-11")}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t.add}
              </Button>
            </div>
          </div>
          {planBudgets.length === 0 ? (
            <EmptyHint>{t.planExpensesEmpty}</EmptyHint>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border/60 bg-card/30">
              {planBudgets.map(b => renderRow(b, onRemoveExpense))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

export function MerchantsList({
  state,
  limit = 10,
}: {
  state: ExpenseAnalysisState
  limit?: number
}) {
  const { t } = useI18n()
  const { merchants, money } = state
  if (merchants.length === 0) {
    return (
      <EmptyHint icon={ShoppingBag}>
        {t.expenseAnalysis.merchants.empty}
      </EmptyHint>
    )
  }
  const max = merchants[0]?.total || 1
  return (
    <ul className="space-y-2.5">
      {merchants.slice(0, limit).map(m => (
        <li key={m.concept} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate" title={m.concept}>
              {m.concept}{" "}
              <span className="text-xs text-muted-foreground">
                ({fill(t.expenseAnalysis.ranking.times, { n: m.count })})
              </span>
            </span>
            <span className="font-medium tabular-nums">
              <Sensitive>{money.format(m.total)}</Sensitive>
            </span>
          </div>
          <ProgressBar
            pct={(m.total / max) * 100}
            color={CHART_EXPENSE_COLOR}
          />
        </li>
      ))}
    </ul>
  )
}

export function MovementRow({
  tx,
  state,
  touch = false,
}: {
  tx: AnalysisTx
  state: ExpenseAnalysisState
  touch?: boolean
}) {
  const { t } = useI18n()
  const label = useCategoryLabel()
  const { money, configApi } = state
  const [editing, setEditing] = useState(false)
  const [splitting, setSplitting] = useState(false)
  const options = useMemo(() => EXPENSE_CATEGORIES, [])
  const excluded = tx.excluded === true
  // A child of a split delegates the editor back to the parent so the user
  // can manage all parts together from any of them.
  const parentId = tx.parentId ?? tx.id
  const currentSplit = (state.config.splits ?? []).find(
    s => s.parentId === parentId,
  )
  const canSplit = tx.amount < 0
  const splitPartCount = currentSplit?.parts.length ?? 0
  return (
    <li className={cn("py-2.5", touch && "py-3", excluded && "opacity-60")}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(e => !e)}
          aria-label={t.expenseAnalysis.movements.changeCategory}
          title={label(tx.category)}
          className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CategoryIcon category={tx.category} size={touch ? "lg" : "md"} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={tx.concept}>
            {tx.concept}
            {tx.parentId && splitPartCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 text-[10px] px-1.5 py-0 align-middle"
              >
                {fill(t.expenseAnalysis.budgets.splitBadge, {
                  n: splitPartCount,
                })}
              </Badge>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {excluded
              ? t.expenseAnalysis.movements.excluded
              : label(tx.category)}{" "}
            · {tx.entityName} · {money.formatDay(tx.date)}
          </p>
        </div>
        <span
          className={cn(
            "whitespace-nowrap text-sm font-semibold tabular-nums",
            tx.amount >= 0 ? "text-green-600 dark:text-green-400" : "",
          )}
        >
          <Sensitive
            className={
              tx.amount >= 0 ? "text-green-600 dark:text-green-400" : undefined
            }
          >
            {money.formatSigned(tx.amount)}
          </Sensitive>
        </span>
        {canSplit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("shrink-0", touch ? "h-11 w-11" : "h-8 w-8")}
            aria-label={t.expenseAnalysis.budgets.split}
            title={t.expenseAnalysis.budgets.split}
            onClick={() => setSplitting(s => !s)}
          >
            <SplitIcon className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("shrink-0", touch ? "h-11 w-11" : "h-8 w-8")}
          aria-label={
            excluded
              ? t.expenseAnalysis.movements.include
              : t.expenseAnalysis.movements.exclude
          }
          title={
            excluded
              ? t.expenseAnalysis.movements.include
              : t.expenseAnalysis.movements.exclude
          }
          onClick={() => void configApi.toggleExcluded(tx.id)}
        >
          {excluded ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </Button>
      </div>
      {editing && (
        <div className="mt-2 flex flex-col gap-2 rounded-md border bg-muted/40 p-2 sm:flex-row sm:items-center">
          <select
            aria-label={t.expenseAnalysis.movements.changeCategory}
            value={tx.category}
            onChange={async e => {
              await configApi.recategorize(
                tx,
                e.target.value as ExpenseCategoryId,
              )
              setEditing(false)
            }}
            className={cn(SELECT_CLASS, "sm:max-w-xs", touch && "h-11")}
          >
            {options.map(c => (
              <option key={c.id} value={c.id}>
                {label(c.id)}
              </option>
            ))}
          </select>
        </div>
      )}
      {splitting && (
        <SplitEditor
          parentId={parentId}
          totalAmount={Math.abs(
            tx.parentId ? tx.amount * (splitPartCount || 1) : tx.amount,
          )}
          existing={currentSplit?.parts ?? []}
          money={money}
          label={label}
          touch={touch}
          t={t.expenseAnalysis.budgets}
          onSave={async parts => {
            await configApi.setSplit(parentId, parts)
            setSplitting(false)
          }}
          onRemove={async () => {
            await configApi.removeSplit(parentId)
            setSplitting(false)
          }}
          onClose={() => setSplitting(false)}
        />
      )}
    </li>
  )
}

/**
 * Editor for splitting a single expense transaction into N parts, each with
 * its own category, amount and optional note. Persists via configApi.setSplit
 * (which is also responsible for NOT saving unless the parts sum to the
 * parent's total amount).
 */
function SplitEditor({
  parentId,
  totalAmount,
  existing,
  money,
  label,
  touch,
  t,
  onSave,
  onRemove,
  onClose,
}: {
  parentId: string
  totalAmount: number
  existing: ExpenseSplitPart[]
  money: { format: (n: number) => string }
  label: (id: ExpenseCategoryId) => string
  touch: boolean
  t: Record<string, string>
  onSave: (parts: ExpenseSplitPart[]) => Promise<void> | void
  onRemove: () => Promise<void> | void
  onClose: () => void
}) {
  const { t: tr } = useI18n()
  const [parts, setParts] = useState<ExpenseSplitPart[]>(() =>
    existing.length > 0
      ? existing
      : [
          {
            id: Math.random().toString(36).slice(2, 10),
            category: "groceries" as ExpenseCategoryId,
            amount: 0,
          },
        ],
  )

  const total = parts.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const diff = Math.round((totalAmount - total) * 100) / 100
  const isExact = Math.abs(diff) < 0.005

  const addPart = () => {
    setParts(ps => [
      ...ps,
      {
        id: Math.random().toString(36).slice(2, 10),
        category: "groceries" as ExpenseCategoryId,
        amount: 0,
      },
    ])
  }

  const removePart = (id: string) => {
    setParts(ps => ps.filter(p => p.id !== id))
  }

  const updatePart = (
    id: string,
    patch: Partial<Pick<ExpenseSplitPart, "category" | "amount" | "note">>,
  ) => {
    setParts(ps => ps.map(p => (p.id === id ? { ...p, ...patch } : p)))
  }

  const save = async () => {
    if (!isExact) return
    await onSave(parts)
  }

  return (
    <div className="mt-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-semibold">{t.split}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {tr.expenseAnalysis.budgets.splitAmountLabel}:{" "}
            <strong className="tabular-nums text-foreground">
              {money.format(totalAmount)}
            </strong>
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {money.format(total)} / {money.format(totalAmount)}
          </span>
        </div>
      </div>

      <ul className="space-y-2">
        {parts.map(p => (
          <li
            key={p.id}
            className={cn(
              "grid grid-cols-12 items-center gap-2",
              touch && "gap-1.5",
            )}
          >
            <select
              aria-label={t.splitCategoryLabel}
              value={p.category}
              onChange={e =>
                updatePart(p.id, { category: e.target.value as ExpenseCategoryId })
              }
              className={cn(
                SELECT_CLASS,
                "col-span-5",
                touch && "h-11",
              )}
            >
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>
                  {label(c.id)}
                </option>
              ))}
            </select>
            <Input
              aria-label={t.splitAmountLabel}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={p.amount === 0 ? "" : String(p.amount)}
              onChange={e =>
                updatePart(p.id, {
                  amount: e.target.value === "" ? 0 : Number(e.target.value),
                })
              }
              placeholder={`${t.splitAmountLabel} (${money.format(totalAmount)})`}
              className={cn("col-span-3 tabular-nums", touch && "h-11")}
            />
            <Input
              aria-label={t.splitNote}
              type="text"
              value={p.note ?? ""}
              onChange={e => updatePart(p.id, { note: e.target.value })}
              placeholder={t.splitNote}
              className={cn("col-span-3", touch && "h-11")}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.splitRemove}
              onClick={() => removePart(p.id)}
              className={cn("col-span-1", touch ? "h-11 w-11" : "h-8 w-8")}
            >
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={addPart}>
          <Plus className="h-4 w-4 mr-1" />
          {t.splitAddPart}
        </Button>
        <div className="flex items-center gap-2">
          {existing.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void onRemove()}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {t.splitRemoveAll}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
          <Button size="sm" disabled={!isExact} onClick={() => void save()}>
            {tr.expenseAnalysis.budgets.add}
          </Button>
        </div>
      </div>

      {!isExact && (
        <p
          className={cn(
            "mt-2 text-xs",
            diff < 0 ? "text-red-600" : "text-amber-600",
          )}
        >
          {diff < 0
            ? fill(t.splitSumOver, { amount: money.format(Math.abs(diff)) })
            : fill(t.splitSumShort, { amount: money.format(diff) })}
        </p>
      )}
      {isExact && (
        <p className="mt-2 text-xs text-green-600">
          {fill(t.splitSumMustMatch, { amount: money.format(totalAmount) })}
        </p>
      )}
    </div>
  )
}
