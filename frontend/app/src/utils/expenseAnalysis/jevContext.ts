const STORAGE_KEY = "finanze.jevContext"

export const DEFAULT_JEV_CONTEXT = `Notas de esta casa (se envían a Jev como user_notes, además del perfil estructurado):

Cuentas
- Santander = cuenta corriente del día a día. Aquí cae la nómina y salen los pagos con tarjeta.
- MyInvestor = ahorro / inversión. Cualquier transferencia o traspaso hacia MyInvestor es savingsInvestment, no gasto.
- Revolut = cuenta donde va el dinero para la comida y los gastos habituales de casa. Los pagos hechos desde Revolut se categorizan por el comercio (groceries / restaurants / etc.), NO por ser Revolut.

Nómina y ahorro
- NOMINA / ABONO NOMINA / SALARIO = sueldo. En España suele entrar el 28–31.
- Ese sueldo pertenece al mes siguiente.
- Justo después de la nómina suelo pasar parte a MyInvestor. Aunque el banco solo ponga TRANSFERENCIA, eso es el barrido de ahorro del sueldo y también pertenece al mes siguiente.

Bizum y cenas
- Pago en restaurante / bar / Glovo / Uber Eats y al poco un BIZUM RECIBIDO de un importe parecido (a menudo la mitad) = me están devolviendo su parte de esa cena.
- Ese Bizum no es ingreso extra. La cena sigue en restaurants; el Bizum es bizumReceived.
- BIZUM ENVIADO a un amigo o familiar = familyFriends. En particular, todo lo que vaya a "Antonio Navarro" es familyFriends (amigo cercano: cualquier Bizum enviado a él es devolver/favorecer).

Comercios habituales
- Supermercados: Mercadona, Lidl, Carrefour, Consum, Aldi, Día = groceries.
- Suscripciones digitales: Netflix, Spotify, iCloud, OpenAI, ChatGPT = subscriptions.
- Telefonía y recibos: Movistar, Vodafone, Orange, Digi, Lowi, recibo de luz/gas = utilities.
- Viajes y reservas: Renfe, Iryo, Ouigo, Iberia, Vueling, Ryanair, Airbnb, Booking = travel.
- Tiendas generales: Amazon, Zara, H&M, Ikea, Decathlon, Primor = shopping.
- Restaurantes y delivery: Glovo, Uber Eats, Just Eat, restaurantes, bares, cafeterías = restaurants.
- Transporte: gasolineras (Repsol, Cepsa, BP, Shell, Pago Mobile de gasoline), Uber, Cabify, Renfe = transport.

Deporte y salud
- TNF Box = CrossFit, cajón = sports.
- Otros gimnasios: Basic-Fit, VivaGym, McFit, padel, escalada = sports.
- Farmacia, dentista, clínica, seguro médico (Sanitas, Adeslas, DKV) = health.

Otros
- Estanco / tabaco / vape = shopping (compra de tabaco). No es groceries ni restaurants.
- Pagos defectuosos, devoluciones de comercios, cobros indebidos = fees si vienen del banco, otherIncome si es devolución de un comercio (un reembolso de Amazon, por ejemplo).
- Llamadas recibidas de teléfono, SMS o cargos de operadoras sin importe (movimientos con importe 0 o casi 0) = uncategorized. No hay categoría para "tráfico entrante".
- Bizum recibido de Antonio Navarro = bizumReceived (no es income extra, es devolución/cuenta pendiente).

Reglas de desempate
- Si no estoy seguro entre dos categorías, prefiero uncategorized a equivocarme.
- Comercio español en mayúsculas (TRANSFERENCIA, COMPRA, ABONO) sigue siendo un movimiento normal: clasifica por el resto del concepto.

Auto-transferencias
- Las transferencias entre tus propias cuentas también cuentan como income/expense del mes (otherIncome si entran, uncategorized si salen sin coincidir un seed rule). El usuario prefiere verlas reflejadas en el flujo mensual aunque sean movimientos internos.
- Aun así, si el banco las etiqueta explícitamente como "TRANSFERENCIA PROPIA" o "TRASPASO ENTRE CUENTAS" entre tus cuentas (Santander <-> MyInvestor, Revolut, etc.) y aparece como transferencia de ahorro, puedes marcarlas como ownTransfer si cuadra con la cuenta destino. Ejemplos:
  - "TRANSFERENCIA INMEDIATA DE JESUS MOLINA PIERNAS, CONCEPTO ahorro" hacia otra cuenta tuya -> otherIncome por defecto (el usuario prefiere ver el flujo).
  - Hacia MyInvestor explícitamente -> savingsInvestment.
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
