const STORAGE_KEY = "finanze.jevContext"

export const DEFAULT_JEV_CONTEXT = [
  "Finanzas personales en España. Los movimientos vienen de bancos españoles (Santander y similares).",
  "Los conceptos suelen ir en mayúsculas y abreviados.",
  "NÓMINA, ABONO NOMINA, SALARIO o PAYROLL en un ingreso es la nómina mensual.",
  "En España la nómina a menudo se paga los últimos días laborables del mes anterior.",
  "Bizum RECIBIDO es dinero de otra persona; Bizum ENVIADO es dinero que sale.",
  "Transferencias entre cuentas propias del usuario son ownTransfer, no gasto.",
].join(" ")

export function loadJevContext(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && raw.trim()) return raw
  } catch {
    /* ignore */
  }
  return DEFAULT_JEV_CONTEXT
}

export function saveJevContext(value: string): void {
  const trimmed = value.trim()
  try {
    if (!trimmed || trimmed === DEFAULT_JEV_CONTEXT) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, trimmed)
    }
  } catch {
    /* ignore */
  }
}
