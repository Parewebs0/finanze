import type {
  AnalysisTx,
  ExpenseCategoryId,
  ExpenseSplitPart,
  ExpenseTxSplit,
} from "@/types/expenseAnalysis"
import { getCategory } from "./categories"

const round2 = (n: number) => Math.round(n * 100) / 100 || 0

export function splitChildId(parentId: string, partId: string) {
  return `${parentId}::${partId}`
}

export function parseSplitChildId(id: string): {
  parentId: string
  partId: string
} | null {
  const i = id.indexOf("::")
  if (i <= 0) return null
  return { parentId: id.slice(0, i), partId: id.slice(i + 2) }
}

export function applySplits(
  txs: AnalysisTx[],
  splits: ExpenseTxSplit[],
): AnalysisTx[] {
  if (!splits.length) return txs
  const byParent = new Map(splits.map(s => [s.parentId, s]))
  const out: AnalysisTx[] = []
  for (const tx of txs) {
    const split = byParent.get(tx.id)
    if (!split || tx.amount >= 0 || split.parts.length === 0) {
      out.push(tx)
      continue
    }
    const total = Math.abs(tx.amount)
    let used = 0
    for (const part of split.parts) {
      const raw = Math.min(Math.abs(part.amount), Math.max(0, total - used))
      if (raw <= 0) continue
      used = round2(used + raw)
      const cat = part.category
      out.push({
        ...tx,
        id: splitChildId(tx.id, part.id),
        amount: -round2(raw),
        originalAmount: -round2(raw),
        category: cat,
        group: getCategory(cat).group,
        concept: part.note ? `${tx.concept} · ${part.note}` : tx.concept,
        parentId: tx.id,
      })
    }
    const rest = round2(total - used)
    if (rest > 0.009) {
      out.push({
        ...tx,
        id: splitChildId(tx.id, "rest"),
        amount: -rest,
        originalAmount: -rest,
        category: "cashWithdrawal",
        group: "expense",
        parentId: tx.id,
      })
    }
  }
  return out
}

export function newSplitPart(
  category: ExpenseCategoryId,
  amount: number,
  note?: string,
): ExpenseSplitPart {
  return {
    id: Math.random().toString(36).slice(2, 10),
    category,
    amount: round2(Math.abs(amount)),
    note,
  }
}
