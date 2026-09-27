import { EntitySelector } from "@/components/EntitySelector"
import type { ExpenseAnalysisState } from "@/hooks/useExpenseAnalysis"
import { useI18n } from "@/i18n"

/** Single connected bank or integration. Clearing the choice is ignored so the page never falls back to a global mix. */
export function AnalysisEntitySelector({
  state,
  className,
}: {
  state: ExpenseAnalysisState
  className?: string
}) {
  const { t } = useI18n()
  if (state.analysisEntities.length === 0) return null

  return (
    <EntitySelector
      id="analysis-entity"
      entities={state.analysisEntities}
      selectedEntityIds={state.selectedEntityId ? [state.selectedEntityId] : []}
      onSelectionChange={ids => {
        const next = ids[0]
        if (next) state.setSelectedEntity(next)
      }}
      singleSelect
      placeholder={t.expenseAnalysis.source.placeholder}
      className={className}
    />
  )
}
