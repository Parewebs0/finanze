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


# Choice criteria: each option stands alone, with direction so Jev does not
# put an inflow in an expense bucket (or the reverse).
CATEGORY_CRITERIA: dict[str, str] = {
    "salary": (
        "Inflow only. Regular payroll or wages from an employer "
        "(nómina, salary, payroll). Not a refund, transfer or one-off extra."
    ),
    "otherIncome": (
        "Inflow only. Money coming in that is not salary, Bizum received, "
        "or bank interest."
    ),
    "bizumReceived": "Inflow only. A Bizum received from someone else.",
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
        "Usually outflow. Money sent to family or friends, including Bizum sent. "
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
        "Transfer between the user's own accounts, including broker cash movements. "
        "Not a payment to someone else."
    ),
    "savingsInvestment": (
        "Money moved into savings, funds or investments. Not a purchase "
        "and not an own-account transfer that stays as cash."
    ),
    "uncategorized": (
        "None of the other categories is a clear fit. Prefer this when unsure."
    ),
}

CATEGORY_IDS = frozenset(CATEGORY_CRITERIA)
