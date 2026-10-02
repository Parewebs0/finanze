from enum import Enum
from typing import Optional

from domain.dezimal import Dezimal
from pydantic.dataclasses import dataclass


class InstrumentType(str, Enum):
    STOCK = "STOCK"
    ETF = "ETF"
    MUTUAL_FUND = "MUTUAL_FUND"


@dataclass
class InstrumentDataRequest:
    type: InstrumentType
    isin: Optional[str] = None
    name: Optional[str] = None
    ticker: Optional[str] = None
    currency: Optional[str] = None


@dataclass
class InstrumentOverview:
    isin: Optional[str] = None
    name: Optional[str] = None
    currency: Optional[str] = None
    symbol: Optional[str] = None
    type: Optional[InstrumentType] = None
    market: Optional[str] = None
    price: Optional[Dezimal] = None


@dataclass
class FundBreakdownItem:
    label: str
    long_pct: float
    short_pct: float


@dataclass
class FundBreakdownSection:
    type: str  # "stock-sector" | "regional-exposure" | "asset-allocation" | "market-capitalization"
    items: list[FundBreakdownItem]


@dataclass
class InstrumentInfo:
    name: str
    currency: str
    type: InstrumentType
    price: Dezimal
    symbol: Optional[str] = None
    issuer: Optional[str] = None
    breakdown: Optional[list[FundBreakdownSection]] = None
    breakdown_date: Optional[str] = None
