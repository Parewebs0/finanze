from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from application.ports.entity_port import EntityPort
from application.ports.external_entity_fetcher import ExternalEntityFetcher
from application.ports.external_entity_port import ExternalEntityPort
from application.ports.external_integration_port import ExternalIntegrationPort
from application.ports.last_fetches_port import LastFetchesPort
from application.ports.position_port import PositionPort
from application.ports.transaction_handler_port import TransactionHandlerPort
from application.use_cases.fetch_external_financial_data import (
    FetchExternalFinancialDataImpl,
)
from domain.entity import Entity, EntityOrigin, EntityType
from domain.external_entity import (
    ExternalEntity,
    ExternalEntityStatus,
    ExternalFetchRequest,
)
from domain.external_integration import ExternalIntegrationId
from domain.fetch_result import FetchResultCode


def _build_use_case(external_entity, entity, fetcher=None):
    external_entity_port = AsyncMock(spec=ExternalEntityPort)
    external_entity_port.get_by_id = AsyncMock(return_value=external_entity)

    entity_port = AsyncMock(spec=EntityPort)
    entity_port.get_by_id = AsyncMock(return_value=entity)

    position_port = AsyncMock(spec=PositionPort)
    external_integration_port = AsyncMock(spec=ExternalIntegrationPort)
    external_integration_port.get_payloads_by_type = AsyncMock(return_value={})
    last_fetches_port = AsyncMock(spec=LastFetchesPort)
    last_fetches_port.get_by_entity_id = AsyncMock(return_value=None)
    transaction_handler_port = MagicMock(spec=TransactionHandlerPort)

    fetchers = {}
    if fetcher is not None:
        fetchers[ExternalIntegrationId.ENABLE_BANKING] = fetcher

    use_case = FetchExternalFinancialDataImpl(
        entity_port,
        external_entity_port,
        position_port,
        fetchers,
        external_integration_port,
        last_fetches_port,
        transaction_handler_port,
    )
    return use_case, last_fetches_port


def _make_entity(entity_id):
    return Entity(
        id=entity_id,
        name="External Bank",
        natural_id="external-bank",
        type=EntityType.FINANCIAL_INSTITUTION,
        origin=EntityOrigin.EXTERNALLY_PROVIDED,
        icon_url=None,
    )


def _make_external_entity(entity_id, status):
    return ExternalEntity(
        id=uuid4(),
        entity_id=entity_id,
        status=status,
        provider=ExternalIntegrationId.ENABLE_BANKING,
    )


class TestFetchExternalFinancialDataGuard:
    @pytest.mark.asyncio
    async def test_returns_link_expired_when_not_linked(self):
        entity_id = uuid4()
        external_entity = _make_external_entity(
            entity_id, ExternalEntityStatus.UNLINKED
        )
        entity = _make_entity(entity_id)
        use_case, last_fetches_port = _build_use_case(external_entity, entity)

        result = await use_case.execute(
            ExternalFetchRequest(external_entity_id=external_entity.id)
        )

        assert result.code == FetchResultCode.LINK_EXPIRED
        last_fetches_port.save.assert_not_called()

    @pytest.mark.asyncio
    async def test_does_not_setup_provider_when_not_linked(self):
        entity_id = uuid4()
        external_entity = _make_external_entity(entity_id, ExternalEntityStatus.ORPHAN)
        entity = _make_entity(entity_id)
        fetcher = MagicMock(spec=ExternalEntityFetcher)
        fetcher.setup = AsyncMock()
        fetcher.global_position = AsyncMock()
        use_case, last_fetches_port = _build_use_case(external_entity, entity, fetcher)

        result = await use_case.execute(
            ExternalFetchRequest(external_entity_id=external_entity.id)
        )

        assert result.code == FetchResultCode.LINK_EXPIRED
        fetcher.setup.assert_not_called()
        fetcher.global_position.assert_not_called()
        last_fetches_port.save.assert_not_called()


class TestFetchExternalFinancialDataTransactions:
    def _build(self, fetcher, existing_refs=()):
        from application.ports.transaction_port import TransactionPort
        from domain.global_position import GlobalPosition

        entity_id = uuid4()
        external_entity = _make_external_entity(entity_id, ExternalEntityStatus.LINKED)
        entity = _make_entity(entity_id)

        external_entity_port = AsyncMock(spec=ExternalEntityPort)
        external_entity_port.get_by_id = AsyncMock(return_value=external_entity)
        entity_port = AsyncMock(spec=EntityPort)
        entity_port.get_by_id = AsyncMock(return_value=entity)
        position_port = AsyncMock(spec=PositionPort)
        external_integration_port = AsyncMock(spec=ExternalIntegrationPort)
        external_integration_port.get_payloads_by_type = AsyncMock(return_value={})
        last_fetches_port = AsyncMock(spec=LastFetchesPort)
        last_fetches_port.get_by_entity_id = AsyncMock(return_value=None)
        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def _noop_tx():
            yield

        transaction_handler_port = MagicMock(spec=TransactionHandlerPort)
        transaction_handler_port.start = MagicMock(side_effect=lambda: _noop_tx())
        transaction_port = AsyncMock(spec=TransactionPort)
        existing = [MagicMock(ref=r) for r in existing_refs]
        transaction_port.get_by_entity_and_source = AsyncMock(
            return_value=MagicMock(account=existing)
        )

        fetcher.setup = AsyncMock()
        fetcher.global_position = AsyncMock(
            return_value=GlobalPosition(id=uuid4(), entity=entity)
        )

        use_case = FetchExternalFinancialDataImpl(
            entity_port,
            external_entity_port,
            position_port,
            {ExternalIntegrationId.ENABLE_BANKING: fetcher},
            external_integration_port,
            last_fetches_port,
            transaction_handler_port,
            transaction_port,
        )
        return use_case, external_entity, transaction_port, last_fetches_port

    @pytest.mark.asyncio
    async def test_saves_fetched_transactions_and_records_feature(self):
        from domain.entity import Feature
        from domain.transactions import Transactions

        from datetime import datetime

        from domain.dezimal import Dezimal
        from domain.fetch_record import DataSource
        from domain.global_position import ProductType
        from domain.transactions import AccountTx, TxType

        fetcher = MagicMock(spec=ExternalEntityFetcher)
        new_tx = AccountTx(
            id=uuid4(),
            ref="NEW",
            name="PAGO EN MERCADONA",
            amount=Dezimal("42.5"),
            currency="EUR",
            type=TxType.TRANSFER_OUT,
            date=datetime(2026, 9, 1),
            entity=_make_entity(uuid4()),
            source=DataSource.REAL,
            product_type=ProductType.ACCOUNT,
            fees=Dezimal(0),
            retentions=Dezimal(0),
        )
        fetched = Transactions(account=[new_tx])
        fetcher.transactions = AsyncMock(return_value=fetched)
        use_case, external_entity, transaction_port, last_fetches_port = self._build(
            fetcher, existing_refs=["OLD"]
        )

        result = await use_case.execute(
            ExternalFetchRequest(external_entity_id=external_entity.id)
        )

        assert result.code == FetchResultCode.COMPLETED
        fetcher.transactions.assert_awaited_once()
        assert fetcher.transactions.await_args.args[1] == {"OLD"}
        transaction_port.save.assert_awaited_once_with(fetched)
        saved_features = {r.feature for r in last_fetches_port.save.await_args.args[0]}
        assert saved_features == {Feature.POSITION, Feature.TRANSACTIONS}

    @pytest.mark.asyncio
    async def test_unsupported_transactions_keep_position_only(self):
        from domain.entity import Feature
        from domain.exception.exceptions import FeatureNotSupported

        fetcher = MagicMock(spec=ExternalEntityFetcher)
        fetcher.transactions = AsyncMock(side_effect=FeatureNotSupported)
        use_case, external_entity, transaction_port, last_fetches_port = self._build(
            fetcher
        )

        result = await use_case.execute(
            ExternalFetchRequest(external_entity_id=external_entity.id)
        )

        assert result.code == FetchResultCode.COMPLETED
        transaction_port.save.assert_not_called()
        saved_features = {r.feature for r in last_fetches_port.save.await_args.args[0]}
        assert saved_features == {Feature.POSITION}

    @pytest.mark.asyncio
    async def test_transaction_failure_is_partial(self):
        fetcher = MagicMock(spec=ExternalEntityFetcher)
        fetcher.transactions = AsyncMock(side_effect=RuntimeError("boom"))
        use_case, external_entity, transaction_port, _ = self._build(fetcher)

        result = await use_case.execute(
            ExternalFetchRequest(external_entity_id=external_entity.id)
        )

        assert result.code == FetchResultCode.PARTIALLY_COMPLETED
        assert result.details["failedFeatures"] == ["TRANSACTIONS"]
        transaction_port.save.assert_not_called()
