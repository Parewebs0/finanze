import type {
  DateRange,
  PresetRange,
  RangePreset,
} from "@/types/expenseAnalysis"

const DAY_MS = 86_400_000

/** Local yyyy-MM-dd (Ledger used toISOString, which shifts days in UTC+x). */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

/** Inclusive number of calendar days in the range (min 1). */
export function daysInRange(from: string, to: string): number {
  const diff = Math.round(
    (parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / DAY_MS,
  )
  return Math.max(1, diff + 1)
}

/** Number of calendar months touched by the range (min 1). */
export function monthsInRange(from: string, to: string): number {
  const f = parseIsoDate(from)
  const t = parseIsoDate(to)
  const months =
    (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth()) + 1
  return Math.max(1, months)
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = []
  const d = parseIsoDate(from)
  const end = parseIsoDate(to)
  while (d <= end) {
    out.push(toIsoDate(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

/** Immediately preceding period with the same width (Ledger previousRange). */
export function previousRange(range: DateRange): DateRange {
  const width = daysInRange(range.from, range.to)
  const prevTo = addDays(range.from, -1)
  const prevFrom = addDays(prevTo, -(width - 1))
  return { from: prevFrom, to: prevTo }
}

export const RANGE_PRESETS: RangePreset[] = [
  "month",
  "prevMonth",
  "3m",
  "6m",
  "year",
  "all",
  "custom",
]

export const ALL_TIME_START = "2000-01-01"

export function presetRange(preset: RangePreset, now = new Date()): DateRange {
  const y = now.getFullYear()
  const m = now.getMonth()
  const today = toIsoDate(now)
  switch (preset) {
    case "prevMonth":
      return {
        from: toIsoDate(new Date(y, m - 1, 1)),
        to: toIsoDate(new Date(y, m, 0)),
      }
    case "3m":
      return { from: toIsoDate(new Date(y, m - 2, 1)), to: today }
    case "6m":
      return { from: toIsoDate(new Date(y, m - 5, 1)), to: today }
    case "year":
      return { from: `${y}-01-01`, to: today }
    case "all":
      return { from: ALL_TIME_START, to: today }
    case "month":
    case "custom":
    default:
      return { from: toIsoDate(new Date(y, m, 1)), to: today }
  }
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

/** Rebuilds the active preset from URL params (Ledger detectPreset). */
export function detectPreset(
  from?: string | null,
  to?: string | null,
  now = new Date(),
): PresetRange {
  const validFrom = from && ISO_RE.test(from) ? from : null
  const validTo = to && ISO_RE.test(to) ? to : null
  const first = validFrom ?? presetRange("month", now).from
  const last = validTo ?? toIsoDate(now)
  for (const key of RANGE_PRESETS) {
    if (key === "custom") continue
    const p = presetRange(key, now)
    if (p.from === first && p.to === last) {
      return { from: first, to: last, preset: key }
    }
  }
  return { from: first, to: last, preset: validFrom ? "custom" : "month" }
}

export function isInRange(date: string, range: DateRange): boolean {
  return date >= range.from && date <= range.to
}
