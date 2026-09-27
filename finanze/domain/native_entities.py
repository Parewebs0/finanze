from typing import Optional
from uuid import UUID

from domain.entity import (
    Entity,
    EntityOrigin,
    EntityType,
    Feature,
)
from domain.external_integration import ExternalIntegrationId
from domain.global_position import ProductType
from domain.native_entity import (
    PinChannel,
    PinDetails,
    CredentialType,
    EntitySetupLoginType,
    EntitySessionCategory,
    NativeFinancialEntity,
    NativeCryptoWalletEntity,
    NativeCryptoExchangeEntity,
)

MY_INVESTOR = NativeFinancialEntity(
    id=UUID("e0000000-0000-0000-0000-000000000001"),
    name="MyInvestor",
    natural_id="BACAESMM",
    type=EntityType.FINANCIAL_INSTITUTION,
    origin=EntityOrigin.NATIVE,
    features=[Feature.POSITION, Feature.AUTO_CONTRIBUTIONS, Feature.TRANSACTIONS],
    products=[
        ProductType.ACCOUNT,
        ProductType.CARD,
        ProductType.STOCK_ETF,
        ProductType.FUND,
        ProductType.FUND_PORTFOLIO,
        ProductType.DEPOSIT,
        ProductType.CREDIT,
    ],
    setup_login_type=EntitySetupLoginType.AUTOMATED,
    session_category=EntitySessionCategory.UNDEFINED,
    pin=PinDetails(positions=6, channel=PinChannel.SMS),
    credentials_template={
        "user": CredentialType.ID,
        "password": CredentialType.PASSWORD,
    },
    icon_url=None,
)

UNICAJA = NativeFinancialEntity(
    id=UUID("e0000000-0000-0000-0000-000000000002"),
    name="Unicaja",
    natural_id="UCJAES2M",
    type=EntityType.FINANCIAL_INSTITUTION,
    origin=EntityOrigin.NATIVE,
    features=[Feature.POSITION, Feature.AUTO_CONTRIBUTIONS],
    products=[ProductType.ACCOUNT, ProductType.CARD, ProductType.LOAN],
    setup_login_type=EntitySetupLoginType.MANUAL,
    session_category=EntitySessionCategory.UNDEFINED,
    credentials_template={
        "user": CredentialType.ID,
        "password": CredentialType.PASSWORD,
        "abck": CredentialType.INTERNAL,
    },
    icon_url=None,
)

TRADE_REPUBLIC = NativeFinancialEntity(
    id=UUID("e0000000-0000-0000-0000-000000000003"),
    name="Trade Republic",
    natural_id="TRBKDEBB",
    type=EntityType.FINANCIAL_INSTITUTION,
    origin=EntityOrigin.NATIVE,
    features=[Feature.POSITION, Feature.TRANSACTIONS, Feature.AUTO_CONTRIBUTIONS],
    products=[
        ProductType.ACCOUNT,
        ProductType.STOCK_ETF,
        ProductType.FUND,
        ProductType.CRYPTO,
    ],
    setup_login_type=EntitySetupLoginType.AUTOMATED,
    session_category=EntitySessionCategory.SHORT,
    pin=PinDetails(positions=4, channel=PinChannel.SMS),
    credentials_template={
        "phone": CredentialType.PHONE,
        "password": CredentialType.PIN,
        "awsWafToken": CredentialType.INTERNAL_TEMP,
    },
    icon_url=None,
)
