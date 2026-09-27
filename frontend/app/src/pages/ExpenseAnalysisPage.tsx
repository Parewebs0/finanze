import { useExpenseAnalysis } from "@/hooks/useExpenseAnalysis"
import { useIsNarrowViewport } from "@/hooks/useMediaQuery"
import { ExpenseAnalysisDesktop } from "@/components/expenseAnalysis/ExpenseAnalysisDesktop"
import { ExpenseAnalysisMobile } from "@/components/expenseAnalysis/ExpenseAnalysisMobile"

/**
 * Thin container: owns the shared analysis state (data, selectors, filters)
 * and picks the view for the current viewport, using the same 768px
 * breakpoint the Layout uses to switch to the mobile bottom navigation.
 */
export default function ExpenseAnalysisPage() {
  const state = useExpenseAnalysis()
  const isNarrow = useIsNarrowViewport()
  return isNarrow ? (
    <ExpenseAnalysisMobile state={state} />
  ) : (
    <ExpenseAnalysisDesktop state={state} />
  )
}
