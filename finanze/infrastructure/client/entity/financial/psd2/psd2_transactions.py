"""Helpers to map PSD2 (Enable Banking / GoCardless) booked account
transactions into Finanze ``AccountTx`` objects.

Finanze stores account transaction amounts as absolute values and encodes the
direction in ``TxType`` (TRANSFER_IN / TRANSFER_OUT), so PSD2 signed amounts
or credit/debit indicators are normalised here.
"""

from datetime import date, datetime, timedelta
from hashlib import sha1
from typing import Iterable, Optional
from uuid import uuid4

from dateutil.tz import tzlocal
from domain.dezimal import Dezimal
from domain.entity import Entity
from domain.fetch_record import DataSource
from domain.global_position import ProductType
from domain.transactions import AccountTx, TxType

# First sync goes back this far (the bank decides what it actually returns).
INITIAL_HISTORY_DAYS = 730
# Santander and several ES ASPSPs reject windows longer than ~90 days.
ENABLEBANKING_MAX_HISTORY_DAYS = 90
# Later syncs re-read a window to catch late bookings; refs dedup the overlap.
INCREMENTAL_HISTORY_DAYS = 90
MAX_PAGES_PER_ACCOUNT = 100

# Enable Banking uses BOOK; some ASPSPs still emit BOOKED or OTHR.
BOOKED_STATUSES = {"BOOK", "BOOKED", "OTHR"}


def history_start(
    registered_refs: set[str],
    today: Optional[date] = None,
    max_days: Optional[int] = None,
) -> str:
    today = today or datetime.now(tzlocal()).date()
    days = INCREMENTAL_HISTORY_DAYS if registered_refs else INITIAL_HISTORY_DAYS
    if max_days is not None:
        days = min(days, max_days)
    return (today - timedelta(days=days)).isoformat()


def _parse_date(*values: Optional[str]) -> Optional[datetime]:
    for value in values:
        if not value:
            continue
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            try:
                parsed = datetime.strptime(str(value)[:10], "%Y-%m-%d")
            except ValueError:
                continue
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=tzlocal())
        return parsed
    return None


def _join_text(parts: Iterable[Optional[str]]) -> str:
    return " ".join(p.strip() for p in parts if p and p.strip()).strip()


def build_tx_name(remittance: str, counterparty: Optional[str], fallback: str) -> str:
    name = (remittance or "").strip()
    cp = (counterparty or "").strip()
    if cp and cp.lower() not in name.lower():
        name = f"{name} - {cp}" if name else cp
    return name or fallback


def fallback_ref(*parts: object) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return sha1(raw.encode("utf-8")).hexdigest()


def build_account_tx(
    *,
    ref: str,
    name: str,
    signed_amount: Dezimal,
    currency: str,
    tx_date: datetime,
    entity: Entity,
) -> AccountTx:
    tx_type = TxType.TRANSFER_IN if signed_amount >= 0 else TxType.TRANSFER_OUT
    amount = abs(signed_amount)
    return AccountTx(
        id=uuid4(),
        ref=ref,
        name=name,
        amount=amount,
        currency=currency,
        type=tx_type,
        date=tx_date,
        entity=entity,
        source=DataSource.REAL,
        product_type=ProductType.ACCOUNT,
        fees=Dezimal(0),
        retentions=Dezimal(0),
        net_amount=amount,
    )


def map_enablebanking_tx(
    raw: dict, account_uid: str, entity: Entity
) -> Optional[AccountTx]:
    """Map an Enable Banking ``Transaction`` object. Pending ones are skipped
    because their references usually change once booked."""
    status = (raw.get("status") or "BOOK").upper()
    if status not in BOOKED_STATUSES:
        return None

    amount_obj = raw.get("transaction_amount") or {}
    raw_amount = amount_obj.get("amount")
    currency = amount_obj.get("currency")
    if raw_amount is None or not currency:
        return None

    amount = Dezimal(str(raw_amount))
    indicator = (raw.get("credit_debit_indicator") or "").upper()
    if indicator == "DBIT":
        amount = -abs(amount)
    elif indicator == "CRDT":
        amount = abs(amount)

    tx_date = _parse_date(
        raw.get("booking_date"), raw.get("value_date"), raw.get("transaction_date")
    )
    if not tx_date:
        return None

    remittance = _join_text(raw.get("remittance_information") or [])
    party = raw.get("creditor") if amount < 0 else raw.get("debtor")
    counterparty = (party or {}).get("name") if isinstance(party, dict) else None
    code_desc = (raw.get("bank_transaction_code") or {}).get("description")
    name = build_tx_name(
        remittance, counterparty, code_desc or raw.get("note") or "Transaction"
    )

    ref = (
        raw.get("entry_reference")
        or raw.get("transaction_id")
        or fallback_ref(account_uid, tx_date.date().isoformat(), amount, currency, name)
    )

    return build_account_tx(
        ref=str(ref),
        name=name,
        signed_amount=amount,
        currency=currency,
        tx_date=tx_date,
        entity=entity,
    )


def map_gocardless_tx(
    raw: dict, account_id: str, entity: Entity
) -> Optional[AccountTx]:
    """Map a GoCardless (Nordigen) booked transaction."""
    amount_obj = raw.get("transactionAmount") or {}
    raw_amount = amount_obj.get("amount")
    currency = amount_obj.get("currency")
    if raw_amount is None or not currency:
        return None
    amount = Dezimal(str(raw_amount))

    tx_date = _parse_date(
        raw.get("bookingDate"), raw.get("valueDate"), raw.get("bookingDateTime")
    )
    if not tx_date:
        return None

    remittance = raw.get("remittanceInformationUnstructured") or _join_text(
        raw.get("remittanceInformationUnstructuredArray") or []
    )
    counterparty = raw.get("creditorName") if amount < 0 else raw.get("debtorName")
    name = build_tx_name(
        remittance,
        counterparty,
        raw.get("additionalInformation") or "Transaction",
    )

    ref = (
        raw.get("transactionId")
        or raw.get("internalTransactionId")
        or fallback_ref(account_id, tx_date.date().isoformat(), amount, currency, name)
    )

    return build_account_tx(
        ref=str(ref),
        name=name,
        signed_amount=amount,
        currency=currency,
        tx_date=tx_date,
        entity=entity,
    )
