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


CATEGORY_CRITERIA: dict[str, str] = {
    "salary": "Payroll, wages, or a salary payment into the account.",
    "otherIncome": "Other money coming in that is not salary, bizum, or interest.",
    "bizumReceived": "A Bizum received from someone else.",
    "interest": "Bank interest credited to the account.",
    "housing": "Rent, mortgage, or community fees for a home.",
    "utilities": "Electricity, gas, water, internet, or mobile phone bills.",
    "groceries": "Supermarkets and grocery shops such as Mercadona, Lidl, Carrefour, or Consum.",
    "restaurants": "Restaurants, bars, cafes, or food delivery such as Glovo or Uber Eats.",
    "transport": "Fuel, public transport, taxis, parking, tolls, Uber, Cabify, or Renfe.",
    "subscriptions": "Recurring digital subscriptions such as Netflix, Spotify, iCloud, or OpenAI.",
    "leisure": "Cinema, concerts, games, hobbies, or other entertainment.",
    "health": "Pharmacy, clinic, dentist, insurance, or other healthcare.",
    "shopping": "Shops and online stores such as Amazon, Zara, Ikea, or Decathlon.",
    "familyFriends": "Money sent to or received from family or friends, including Bizum sent.",
    "sports": "Gym, sports club, padel, or climbing.",
    "travel": "Flights, hotels, Airbnb, Booking, or other travel.",
    "fees": "Bank fees, commissions, or card charges that are not a purchase.",
    "ownTransfer": "Transfer between the user's own accounts, including broker cash movements.",
    "savingsInvestment": "Money moved into savings, funds, or investments.",
    "uncategorized": "None of the other categories fits this payment.",
}

CATEGORY_IDS = frozenset(CATEGORY_CRITERIA)
