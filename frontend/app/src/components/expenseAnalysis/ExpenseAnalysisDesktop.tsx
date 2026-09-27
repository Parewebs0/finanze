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
  fill,
  useCategoryLabel,
} from "./shared"
import { AnalysisEntitySelector } from "./AnalysisEntitySelector"
import { CategorizerCard } from "./CategorizerCard"
