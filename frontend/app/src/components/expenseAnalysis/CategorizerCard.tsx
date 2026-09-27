import { useState } from "react"
import { ChevronDown, FileText, Sparkles, Unplug } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { SecretInput } from "@/components/ui/SecretInput"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { useI18n } from "@/i18n"
import { useModalBackHandler } from "@/hooks/useModalBackHandler"
import type { ExpenseAnalysisState } from "@/hooks/useExpenseAnalysis"
import type { CategorizerProvider } from "@/services/api"
import { cn } from "@/lib/utils"
import {
  DEFAULT_JEV_CONTEXT,
  loadJevContext,
  saveJevContext,
} from "@/utils/expenseAnalysis/jevContext"
import { fill, PAGE_CARD_CLASS } from "./shared"

function ContextModal({
  open,
  title,
  hint,
  saveLabel,
  resetLabel,
  cancelLabel,
  value,
  onChange,
  onSave,
  onReset,
  onClose,
}: {
  open: boolean
  title: string
  hint: string
  saveLabel: string
  resetLabel: string
  cancelLabel: string
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onReset: () => void
  onClose: () => void
}) {
  useModalBackHandler(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{hint}</p>
          <textarea
            className="min-h-[180px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={value}
            onChange={event => onChange(event.target.value)}
          />
        </CardContent>
        <div className="flex flex-wrap justify-end gap-2 px-6 pb-6">
          <Button type="button" variant="ghost" onClick={onReset}>
            {resetLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" onClick={onSave}>
            {saveLabel}
          </Button>
        </div>
      </Card>
    </div>
  )
}

export function CategorizerCard({ state }: { state: ExpenseAnalysisState }) {
  const { t } = useI18n()
  const copy = t.expenseAnalysis.categorizer
  const connected = state.categorizer?.connected === true
  const [provider, setProvider] = useState<CategorizerProvider>(
    state.categorizer?.provider ?? "openrouter",
  )
  const [apiKey, setApiKey] = useState("")
  const [onlyUncategorized, setOnlyUncategorized] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [contextDraft, setContextDraft] = useState(loadJevContext)

  const selectedProvider = state.categorizer?.provider ?? provider

  const connect = async () => {
    setNotice(null)
    try {
      await state.connectJev(provider, apiKey.trim())
      setApiKey("")
      setNotice(copy.connected)
    } catch {
      setNotice(null)
    }
  }

  const recategorize = async () => {
    setNotice(null)
    try {
      const count = await state.recategorizeWithJev(onlyUncategorized)
      setNotice(fill(copy.done, { n: count }))
    } catch {
      setNotice(null)
    }
  }

  const collapsedLabel =
    (copy as { collapsedHint?: string }).collapsedHint ??
    (connected
      ? fill(copy.using, {
          provider:
            selectedProvider === "direct" ? copy.direct : copy.openrouter,
          hint: state.categorizer?.keyHint ?? "",
        })
      : copy.description)

  return (
    <Card className={PAGE_CARD_CLASS}>
      <CardHeader className="pb-3">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left"
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
        >
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              {copy.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {open
                ? copy.description
                : connected
                  ? fill(copy.using, {
                      provider:
                        selectedProvider === "direct"
                          ? copy.direct
                          : copy.openrouter,
                      hint: state.categorizer?.keyHint ?? "",
                    })
                  : collapsedLabel}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </CardHeader>
      <CardContent className={cn("space-y-4", !open && "hidden")}>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["openrouter", copy.openrouter],
              ["direct", copy.direct],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={state.categorizerBusy || connected}
              onClick={() => setProvider(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                (connected ? selectedProvider : provider) === value
                  ? "border-transparent bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "border-border text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {connected ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">
              {fill(copy.using, {
                provider:
                  selectedProvider === "direct" ? copy.direct : copy.openrouter,
                hint: state.categorizer?.keyHint ?? "",
              })}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={state.categorizerBusy}
              onClick={() => void state.disconnectJev()}
            >
              <Unplug className="mr-2 h-4 w-4" />
              {copy.disconnect}
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={event => {
              event.preventDefault()
              void connect()
            }}
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="jev-api-key">{copy.apiKey}</Label>
              <SecretInput
                id="jev-api-key"
                value={apiKey}
                autoComplete="off"
                placeholder={
                  provider === "direct" ? copy.directHint : copy.openrouterHint
                }
                onChange={event => setApiKey(event.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={state.categorizerBusy || apiKey.trim().length < 8}
            >
              {state.categorizerBusy ? copy.checking : copy.connect}
            </Button>
          </form>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyUncategorized}
              onChange={event => setOnlyUncategorized(event.target.checked)}
            />
            {copy.onlyUncategorized}
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={!connected || state.categorizing}
            onClick={() => void recategorize()}
          >
            {state.categorizing ? copy.working : copy.recategorize}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setContextDraft(loadJevContext())
              setContextOpen(true)
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            {copy.contextButton ?? "Contexto"}
          </Button>
        </div>

        {(notice || state.categorizerError) && (
          <p
            className={cn(
              "text-sm",
              state.categorizerError
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground",
            )}
          >
            {state.categorizerError ?? notice}
          </p>
        )}
      </CardContent>
      <ContextModal
        open={contextOpen}
        title={copy.contextTitle ?? "Contexto del clasificador"}
        hint={copy.contextHint ?? "Este texto se le pasa a Jev con cada movimiento."}
        saveLabel={copy.contextSave ?? "Guardar"}
        resetLabel={copy.contextReset ?? "Restaurar por defecto"}
        cancelLabel={copy.contextCancel ?? "Cancelar"}
        value={contextDraft}
        onChange={setContextDraft}
        onSave={() => {
          saveJevContext(contextDraft)
          setContextOpen(false)
        }}
        onReset={() => setContextDraft(DEFAULT_JEV_CONTEXT)}
        onClose={() => setContextOpen(false)}
      />
    </Card>
  )
}
