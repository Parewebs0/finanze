import { describe, expect, it } from "vitest"
import { TxType, type AccountTx } from "@/types/transactions"
import { ProductType } from "@/types/position"
import type {
  AnalysisTx,
  ExpenseBudget,
  ExpenseCategoryId,
} from "@/types/expenseAnalysis"
import {
  budgetStatus,
  categoryRanking,
  createCategorizer,
  dailyCashflow,
  daysInRange,
  detectPreset,
  detectRecurring,
  getCategory,
  heatmapWeeks,
  monthGrid,
  monthlyEvolution,
  monthsInRange,
  normalizeConcept,
  presetRange,
  previousRange,
  rangeAggregates,
  requiredWindow,
  rule503020,
  savingsRate,
  signedAmount,
  spendingHeatmap,
  toAnalysisTx,
  topMerchants,
} from "@/utils/expenseAnalysis"

let seq = 0
function tx(
  date: string,
  amount: number,
  category: ExpenseCategoryId,
  concept: string = category,
): AnalysisTx {
  seq += 1
  return {
    id: `tx-${seq}`,
    ref: `ref-${seq}`,
    date,
    amount,
    originalAmount: amount,
    currency: "EUR",
    concept,
    entityId: "e1",
    entityName: "Bank",
    txType: amount >= 0 ? TxType.TRANSFER_IN : TxType.TRANSFER_OUT,
    category,
    group: getCategory(category).group,
  }
}

const MAY = { from: "2026-05-01", to: "2026-05-31" }

const sample: AnalysisTx[] = [
  tx("2026-05-01", 2000, "salary", "Nomina ACME"),
  tx("2026-05-02", -600, "housing", "Alquiler"),
  tx("2026-05-03", -100, "groceries", "Mercadona"),
  tx("2026-05-03", -50, "groceries", "Lidl"),
  tx("2026-05-10", -200, "leisure", "Concierto"),
  tx("2026-05-15", -300, "savingsInvestment", "Revolut*"),
  tx("2026-05-20", -80, "ownTransfer", "Transferencia propia"),
  tx("2026-04-03", -100, "groceries", "Mercadona"),
  tx("2026-04-01", 1800, "salary", "Nomina ACME"),
]

describe("dates", () => {
  const now = new Date(2026, 4, 17) // 17 May 2026

  it("computes inclusive day and month counts", () => {
    expect(daysInRange("2026-05-01", "2026-05-31")).toBe(31)
    expect(daysInRange("2026-05-02", "2026-05-01")).toBe(1)
    expect(monthsInRange("2026-01-15", "2026-03-02")).toBe(3)
  })

  it("builds presets in local time", () => {
    expect(presetRange("month", now)).toEqual({
      from: "2026-05-01",
      to: "2026-05-17",
    })
    expect(presetRange("prevMonth", now)).toEqual({
      from: "2026-04-01",
      to: "2026-04-30",
    })
    expect(presetRange("3m", now).from).toBe("2026-03-01")
    expect(presetRange("year", now).from).toBe("2026-01-01")
  })

  it("detects the preset from URL params", () => {
    expect(detectPreset("2026-04-01", "2026-04-30", now).preset).toBe(
      "prevMonth",
    )
    expect(detectPreset("2026-02-10", "2026-02-20", now).preset).toBe("custom")
    expect(detectPreset(null, null, now)).toEqual({
      from: "2026-05-01",
      to: "2026-05-17",
      preset: "month",
    })
    expect(detectPreset("garbage", null, now).preset).toBe("month")
  })

  it("returns the previous period with the same width", () => {
    expect(previousRange(MAY)).toEqual({ from: "2026-03-31", to: "2026-04-30" })
  })
})

describe("categorization", () => {
  const cat = (
    concept: string,
    amount: number,
    txType = amount >= 0 ? TxType.TRANSFER_IN : TxType.TRANSFER_OUT,
    config = {},
  ) =>
    createCategorizer({
      rules: [],
      budgets: [],
      overrides: [],
      excluded: [],
      ...config,
    }).categorize({ id: "x", concept, amount, txType })

  it("applies Ledger's seeded rules, accent-insensitive", () => {
    expect(cat("COMPRA MERCADONA VALENCIA", -30)).toBe("groceries")
    expect(cat("Abono Nómina", 2000)).toBe("salary")
    expect(cat("NETFLIX.COM", -12.99)).toBe("subscriptions")
    expect(cat("Bizum a favor de Juan", -20)).toBe("familyFriends")
  })

  it("falls back by sign and transaction type", () => {
    expect(cat("Unknown shop", -10)).toBe("uncategorized")
    expect(cat("Unknown sender", 10)).toBe("otherIncome")
    expect(cat("Liquidación", 3, TxType.INTEREST)).toBe("interest")
    expect(cat("Comisión mantenimiento", -2, TxType.FEE)).toBe("fees")
  })
})

describe("adapter", () => {
  const base: AccountTx = {
    id: "a1",
    ref: "r1",
    name: "Mercadona",
    amount: 42.5,
    currency: "EUR",
    type: TxType.TRANSFER_OUT,
    date: "2026-05-03T10:00:00",
    entity: { id: "e1", name: "Santander" } as AccountTx["entity"],
    source: "REAL" as AccountTx["source"],
    product_type: ProductType.ACCOUNT,
    fees: 0,
    retentions: 0,
  } as AccountTx

  it("signs absolute Finanze amounts from the tx type", () => {
    expect(signedAmount({ amount: 10, type: TxType.TRANSFER_OUT })).toBe(-10)
    expect(signedAmount({ amount: 10, type: TxType.TRANSFER_IN })).toBe(10)
    expect(signedAmount({ amount: 3, type: TxType.INTEREST })).toBe(3)
    expect(signedAmount({ amount: 2, type: TxType.FEE })).toBe(-2)
  })

  it("maps to a categorised analysis tx", () => {
    const res = toAnalysisTx(base, {
      targetCurrency: "EUR",
      exchangeRates: null,
      categorizer: createCategorizer({
        rules: [],
        budgets: [],
        overrides: [],
        excluded: [],
      }),
    })
    expect(res).toMatchObject({
      date: "2026-05-03",
      amount: -42.5,
      category: "groceries",
      group: "expense",
      entityName: "Santander",
    })
  })
})

describe("calculations", () => {
  it("aggregates income, expenses and savings like Ledger", () => {
    const agg = rangeAggregates(sample, MAY)
    expect(agg.income).toBe(2000)
    expect(agg.expenses).toBe(950)
    expect(agg.savings).toBe(1050)
    // transfers are excluded from expenses; outflows count as invested
    expect(agg.savingsInvestment).toBe(380)
    expect(agg.avgDailySpend).toBeCloseTo(950 / 31)
    expect(agg.byCategory[0].category).toBe("salary")
    expect(savingsRate(agg)).toBeCloseTo(((1050 + 380) / 2000) * 100)
  })

  it("never returns negative zero for empty periods", () => {
    const empty = rangeAggregates(sample, {
      from: "2020-01-01",
      to: "2020-01-31",
    })
    expect(Object.is(empty.expenses, -0)).toBe(false)
    expect(Object.is(empty.avgDailySpend, -0)).toBe(false)
  })

  it("builds a zero-filled daily cashflow, optionally by category", () => {
    const days = dailyCashflow(sample, MAY)
    expect(days).toHaveLength(31)
    expect(days[2]).toEqual({ date: "2026-05-03", income: 0, expenses: 150 })
    expect(days[14].expenses).toBe(0) // savings transfer ignored
    const groceries = dailyCashflow(sample, MAY, "groceries")
    expect(groceries.reduce((s, d) => s + d.expenses, 0)).toBe(150)
  })

  it("ranks expense categories with share and delta", () => {
    const prev = rangeAggregates(sample, previousRange(MAY))
    const ranking = categoryRanking(rangeAggregates(sample, MAY), prev)
    expect(ranking.map(r => r.category)).toEqual([
      "housing",
      "leisure",
      "groceries",
    ])
    const groceries = ranking.find(r => r.category === "groceries")!
    expect(groceries.count).toBe(2)
    expect(groceries.pct).toBeCloseTo((150 / 950) * 100)
    expect(groceries.delta).toBeCloseTo(50)
    expect(ranking.find(r => r.category === "housing")!.delta).toBeNull()
  })

  it("splits the 50/30/20 rule into needs, wants and savings", () => {
    const res = rule503020(rangeAggregates(sample, MAY))
    expect(res.needs.value).toBe(750)
    expect(res.needs.pct).toBe(37.5)
    expect(res.wants.value).toBe(200)
    expect(res.savings.value).toBe(1430)
    expect(res.savings.target).toBe(20)
  })

  it("scales monthly budgets by the months in range", () => {
    const budgets: ExpenseBudget[] = [
      { category: "groceries", amount: 120 },
      { category: "leisure", amount: 150 },
    ]
    const may = budgetStatus(sample, budgets, MAY)
    expect(may.find(b => b.category === "groceries")).toMatchObject({
      budget: 120,
      spent: 150,
      pct: 125,
      remaining: -30,
    })
    const two = budgetStatus(sample, budgets, {
      from: "2026-04-01",
      to: "2026-05-31",
    })
    expect(two.find(b => b.category === "groceries")).toMatchObject({
      budget: 240,
      spent: 250,
    })
  })

  it("detects stable recurring charges and skips volatile ones", () => {
    const now = new Date(2026, 5, 15)
    const txs = [
      tx("2026-03-05", -12.99, "subscriptions", "NETFLIX.COM 12/03/26"),
      tx("2026-04-05", -12.99, "subscriptions", "NETFLIX.COM 12/04/26"),
      tx("2026-05-05", -13.99, "subscriptions", "NETFLIX.COM 12/05/26"),
      tx("2026-03-10", -20, "leisure", "Cine Yelmo"),
      tx("2026-04-10", -90, "leisure", "Cine Yelmo"),
      tx("2026-05-10", -20, "leisure", "Cine Yelmo"),
      tx("2025-01-10", -9, "subscriptions", "Old service"),
      tx("2025-02-10", -9, "subscriptions", "Old service"),
    ]
    const res = detectRecurring(txs, 6, now)
    expect(res.items).toHaveLength(1)
    expect(res.items[0]).toMatchObject({ monthsSeen: 3, times: 3 })
    expect(res.monthlyTotal).toBeCloseTo(13.32, 2)
    expect(normalizeConcept("NETFLIX.COM 12/03/26 TARJ. 1234")).toBe(
      "netflix com",
    )
  })

  it("computes heatmap, grids, evolution and merchants", () => {
    const heat = spendingHeatmap(sample, 2026)
    expect(heat.find(h => h.date === "2026-05-03")?.spent).toBe(150)
    expect(heat.some(h => h.date === "2026-05-15")).toBe(false)
    const weeks = heatmapWeeks(heat, 2026)
    expect(weeks.flat().filter(Boolean)).toHaveLength(365)
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]) // 1 Jan 2026 = Thursday
    const may = monthGrid(heat, 2026, 4)
    expect(may.every(r => r.length === 7)).toBe(true)
    expect(may.flat().filter(Boolean)).toHaveLength(31)

    const evo = monthlyEvolution(sample, 12, new Date(2026, 4, 20))
    expect(evo).toHaveLength(12)
    expect(evo[11]).toEqual({ month: "2026-05", income: 2000, expenses: 950 })
    expect(evo[10]).toEqual({ month: "2026-04", income: 1800, expenses: 100 })

    const merchants = topMerchants(sample, MAY)
    expect(merchants[0]).toEqual({ concept: "Alquiler", total: 600, count: 1 })
    expect(merchants.some(m => m.concept === "Revolut*")).toBe(false)
  })

  it("computes a single fetch window for every block", () => {
    const now = new Date(2026, 4, 17)
    const w = requiredWindow(MAY, previousRange(MAY), now)
    expect(w.from).toBe("2025-06-01")
    expect(w.to).toBe("2026-12-31")
  })
})
