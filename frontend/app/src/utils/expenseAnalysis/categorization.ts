import { TxType } from "@/types/transactions"
import type {
  ExpenseAnalysisConfig,
  ExpenseCategoryId,
  ExpenseCategoryRule,
} from "@/types/expenseAnalysis"
import { isCategoryId } from "./categories"

/**
 * Rule based categorization engine, ported from Ledger (server/src/lib/rules.ts
 * + the seed rules in server/src/db/index.ts).
 *
 * Precedence (first match wins):
 *   1. Per-transaction override (Ledger: manual recategorization)
 *   2. User rules, in the order they were created (Ledger: learned rules)
 *   3. Finanze transaction type (INTEREST → interest, FEE → fees)
 *   4. Seed rules (Ledger priorities 55/60 first, then 100)
 *   5. Fallback by direction: inflow → otherIncome, outflow → uncategorized
 *
 * Personal rules from Ledger (transfers to the user's own name, the exact
 * 50 € housing transfer) are intentionally NOT seeded; recreate them as user
 * rules (exact amount is supported).
 */

interface CompiledRule {
  re: RegExp
  category: ExpenseCategoryId
  amount: number | null
}

export const SEED_RULES: ExpenseCategoryRule[] = [
  // priority 55-60 (ensureCategories)
  { pattern: "bizum a favor de", category: "familyFriends" },
  { pattern: "bizum de ", category: "bizumReceived" },
  {
    pattern: "retrocesion transferencia|ingreso en cajero|revolut\\*",
    category: "savingsInvestment",
  },
  {
    pattern:
      "local sports|polideportivo|centro deportivo|gimnasio|climbing|padel",
    category: "sports",
  },
  { pattern: "plenergy|aparcamiento|parking", category: "transport" },
  { pattern: "fresh supermerc|supermercado", category: "groceries" },
  {
    pattern:
      "hotel |hostal|vueling|ryanair|iberia|airbnb|booking\\.com|air europa|easyjet",
    category: "travel",
  },
  // priority 100 (seedIfEmpty)
  {
    pattern:
      "mercadona|alcampo|carrefour|lidl|aldi|eroski|consum|dia |hipercor",
    category: "groceries",
  },
  {
    pattern: "repsol|cepsa|bp |shell|gasolinera|estacion de servicio",
    category: "transport",
  },
  {
    pattern: "uber|cabify|bolt|taxi|renfe|metro|emt|alsa|blablacar",
    category: "transport",
  },
  {
    pattern:
      "netflix|spotify|hbo|max |disney|prime video|youtube premium|icloud|openai",
    category: "subscriptions",
  },
  {
    pattern:
      "iberdrola|endesa|naturgy|vodafone|movistar|orange|yoigo|o2 |telecable",
    category: "utilities",
  },
  {
    pattern: "farmac|clinica|hospital|dentista|optica|sanitas|adeslas",
    category: "health",
  },
  {
    pattern:
      "amazon|aliexpress|zara|ikea|decathlon|el corte ingles|media ?markt|apple\\.com",
    category: "shopping",
  },
  {
    pattern: "myinvestor|traspaso entre cuentas|transferencia propia",
    category: "ownTransfer",
  },
  { pattern: "nomina|salary|payroll|abono nomina", category: "salary" },
  {
    pattern:
      "restaurante|rest\\. |bar |cafeteria|cafe |burger|mcdonald|telepizza|domino|glovo|just eat|uber ?eats|deliveroo",
    category: "restaurants",
  },
]

/** 'nómina' matches 'nomina' without duplicating rules. */
export function unaccent(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

export function compileRules(rules: ExpenseCategoryRule[]): CompiledRule[] {
  const compiled: CompiledRule[] = []
  for (const rule of rules) {
    if (!rule.pattern || !isCategoryId(rule.category)) continue
    try {
      compiled.push({
        re: new RegExp(rule.pattern, "i"),
        category: rule.category,
        amount:
          rule.amount === null || rule.amount === undefined
            ? null
            : Number(rule.amount),
      })
    } catch {
      // invalid regex: rule ignored (same as Ledger)
    }
  }
  return compiled
}

export function matchRules(
  rules: CompiledRule[],
  concept: string,
  amount: number,
): ExpenseCategoryId | null {
  const plain = unaccent(concept)
  for (const rule of rules) {
    if (rule.amount !== null && Math.abs(amount - rule.amount) > 0.005) continue
    if (rule.re.test(plain) || rule.re.test(concept)) return rule.category
  }
  return null
}

export function isValidPattern(pattern: string): boolean {
  if (!pattern.trim()) return false
  try {
    new RegExp(pattern, "i")
    return true
  } catch {
    return false
  }
}

/** Regex that matches a concept literally (used when "learning" a rule). */
export function patternFromConcept(concept: string): string {
  return unaccent(concept.trim().toLowerCase())
    .replace(/\s+/g, " ")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export interface Categorizer {
  categorize(input: {
    id: string
    concept: string
    amount: number
    txType: TxType
  }): ExpenseCategoryId
}

const SEED_COMPILED = compileRules(SEED_RULES)

export function createCategorizer(config: ExpenseAnalysisConfig): Categorizer {
  const overrides = new Map<string, ExpenseCategoryId>()
  for (const o of config.overrides ?? []) {
    if (isCategoryId(o.category)) overrides.set(o.txId, o.category)
  }
  const userRules = compileRules(config.rules ?? [])

  return {
    categorize({ id, concept, amount, txType }) {
      const override = overrides.get(id)
      if (override) return override

      const user = matchRules(userRules, concept, amount)
      if (user) return user

      if (txType === TxType.INTEREST) return "interest"
      if (txType === TxType.FEE) return "fees"

      // Seed rules (Mercadona, Repsol, Bizum, nomina, etc.) take precedence.
      const seeded = matchRules(SEED_COMPILED, concept, amount)
      if (seeded) return seeded

      // Simple, no exceptions: any TRANSFER_IN with positive amount is
      // income and must show in the monthly income / Daily Cash Flow.
      // Outflows (TRANSFER_OUT) keep falling through to the uncategorized
      // bucket so user seed rules and overrides still apply to them.
      if (txType === TxType.TRANSFER_IN && amount > 0) {
        return "otherIncome"
      }

      return amount >= 0 ? "otherIncome" : "uncategorized"
    },
  }
}
