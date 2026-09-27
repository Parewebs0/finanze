from enum import Enum
from typing import Optional

from pydantic.dataclasses import dataclass


class CategorizerProvider(str, Enum):
    OPENROUTER = "openrouter"
    DIRECT = "direct"


@dataclass
class CategorizerConnection:
    provider: CategorizerProvider
    api_key: str


@dataclass
class CategorizerStatus:
    connected: bool
    provider: Optional[CategorizerProvider] = None
    key_hint: Optional[str] = None


@dataclass
class CategorizerPayment:
    id: str
    concept: str
    amount: float
    currency: str = "EUR"
    date: str = ""
    entity_name: str = ""


@dataclass
class CategorizerAssignment:
    id: str
    category: str
    confidence: Optional[float] = None


HOUSEHOLD_CONTEXT = {
    "locale": "es-ES",
    "country": "Spain",
    "kind": "personal household banking",
    "notes": (
        "Movements come from Spanish banks (Santander and others). "
        "Concepts are short, often uppercase and abbreviated. "
        "NÓMINA / ABONO NOMINA / SALARIO on an inflow is the monthly paycheck. "
        "Spanish employers often pay that paycheck on the last business days "
        "of the previous month. Bizum RECIBIDO is money received from a person; "
        "Bizum ENVIADO is money sent. Incoming transfers (TRANSFER_IN, "
        "positive amount) are always income. ownTransfer is outflow only."
    ),
}


CATEGORY_CRITERIA: dict[str, str] = {
    "salary": (
        "Inflow only. Regular employer paycheck. Spanish bank texts: "
        "NÓMINA, NOMINA, ABONO NOMINA, SALARIO, PAYROLL, PAGA. "
        "Not a refund and not a one-off extra."
    ),
    "otherIncome": (
        "Inflow only. Money coming in that is not salary, Bizum received, "
        "or bank interest. Includes incoming bank transfers (TRANSFER_IN), "
        "even when the concept has the user's own name or says ahorro."
    ),
    "bizumReceived": (
        "Inflow only. A Bizum received from someone else (BIZUM RECIBIDO)."
    ),
    "interest": "Inflow only. Bank interest credited to the account.",
    "housing": "Outflow only. Rent, mortgage or community fees for a home.",
    "utilities": (
        "Outflow only. Electricity, gas, water, internet or mobile phone bills."
    ),
    "groceries": (
        "Outflow only. Supermarkets and grocery shops such as Mercadona, "
        "Lidl, Carrefour or Consum."
    ),
    "restaurants": (
        "Outflow only. Restaurants, bars, cafes or food delivery such as "
        "Glovo or Uber Eats."
    ),
    "transport": (
        "Outflow only. Fuel, public transport, taxis, parking, tolls, "
        "Uber, Cabify or Renfe."
    ),
    "subscriptions": (
        "Outflow only. Recurring digital subscriptions such as Netflix, "
        "Spotify, iCloud or OpenAI."
    ),
    "leisure": (
        "Outflow only. Cinema, concerts, games, hobbies or other entertainment. "
        "Not sports clubs or travel."
    ),
    "health": (
        "Outflow only. Pharmacy, clinic, dentist, health insurance or other healthcare."
    ),
    "shopping": (
        "Outflow only. Shops and online stores such as Amazon, Zara, Ikea "
        "or Decathlon. Not groceries or restaurants."
    ),
    "familyFriends": (
        "Usually outflow. Money sent to family or friends, including Bizum enviado. "
        "Received Bizum is bizumReceived."
    ),
    "sports": "Outflow only. Gym, sports club, padel or climbing.",
    "travel": (
        "Outflow only. Flights, hotels, Airbnb, Booking or other travel. "
        "Not everyday transport."
    ),
    "fees": (
        "Outflow only. Bank fees, commissions or card charges that are not a purchase."
    ),
    "ownTransfer": (
        "Outflow only. Money leaving this account toward another account "
        "the user owns. Never use this for an incoming transfer "
        "(positive amount / TRANSFER_IN): those are otherIncome."
    ),
    "savingsInvestment": (
        "Outflow only. Money leaving this account into savings, funds or "
        "investments. Never use this for money arriving in the account."
    ),
    "uncategorized": (
        "None of the other categories is a clear fit. Prefer this when unsure."
    ),
}

CATEGORY_IDS = frozenset(CATEGORY_CRITERIA)
