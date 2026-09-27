const STORAGE_KEY = "finanze.jevContext"

export const DEFAULT_JEV_CONTEXT = `Notas de esta casa (se envían a Jev como user_notes, además del perfil estructurado):

Cuentas
- Santander = cuenta corriente del día a día. Aquí cae la nómina y salen los pagos con tarjeta.
- MyInvestor = ahorro / inversión. Cualquier transferencia o traspaso hacia MyInvestor es savingsInvestment, no gasto.

Nómina y ahorro
- NOMINA / ABONO NOMINA / SALARIO = sueldo. En España suele entrar el 28–31.
- Ese sueldo pertenece al mes siguiente.
- Justo después de la nómina suelo pasar parte a MyInvestor. Aunque el banco solo ponga TRANSFERENCIA, eso es el barrido de ahorro del sueldo y también pertenece al mes siguiente.

Bizum y cenas
- Pago en restaurante / bar / Glovo / Uber Eats y al poco un BIZUM RECIBIDO de un importe parecido (a menudo la mitad) = me están devolviendo su parte de esa cena.
- Ese Bizum no es ingreso extra. La cena sigue en restaurants; el Bizum es bizumReceived.
- BIZUM ENVIADO a un amigo o familiar = familyFriends.

Comercios habituales
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
