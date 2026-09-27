const STORAGE_KEY = "finanze.jevContext"

export const DEFAULT_JEV_CONTEXT = `Hogar: finanzas personales en España.
Cuentas propias: Santander (corriente) y MyInvestor (ahorro / inversión).

Cómo leer los conceptos
- Los bancos escriben en MAYÚSCULAS y abreviado.
- Un importe positivo entra. Un importe negativo sale.

Nómina
- NOMINA, ABONO NOMINA, SALARIO, PAYROLL = sueldo del mes.
- En España suele caer los últimos días laborables del mes anterior.
- Ese sueldo pertenece al mes siguiente.

Ahorro justo después de la nómina
- Traspaso o transferencia a MyInvestor / broker / fondo el mismo día o al día siguiente de la nómina = savingsInvestment, no gasto.
- También pertenece al mes del sueldo (mes siguiente si se pagó a final de mes).

Bizum y cenas
- Si hay un pago a restaurante, bar, Glovo o Uber Eats y poco después un BIZUM RECIBIDO de importe parecido, ese Bizum es la otra persona pagando su parte de esa comida.
- No es ingreso extra. El gasto real es la cena menos lo recuperado.
- BIZUM ENVIADO a un amigo o familiar es familyFriends, no restaurante.

Otras convenciones
- Transferencia entre cuentas mías (Santander ↔ MyInvestor cash) = ownTransfer si no es aportación a fondos.
- Mercadona, Lidl, Carrefour, Consum = groceries.
- Netflix, Spotify, iCloud = subscriptions.
`

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
    if (!trimmed || trimmed === DEFAULT_JEV_CONTEXT.trim()) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, trimmed)
    }
  } catch {
    /* ignore */
  }
}
