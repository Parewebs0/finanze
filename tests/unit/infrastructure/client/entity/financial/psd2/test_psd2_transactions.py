from datetime import date
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from domain.dezimal import Dezimal
from domain.entity import Entity, EntityOrigin, EntityType
from domain.external_entity import (
    ExternalEntity,
    ExternalEntityFetchRequest,
    ExternalEntityStatus,
)
from domain.external_integration import ExternalIntegrationId
from domain.global_position import ProductType
from domain.transactions import TxType
from infrastructure.client.entity.financial.psd2.enablebanking_fetcher import (
    EnableBankingFetcher,
)
from infrastructure.client.entity.financial.psd2.gocardless_fetcher import (
    GoCardlessFetcher,
)
from infrastructure.client.entity.financial.psd2.psd2_transactions import (
    history_start,
    map_enablebanking_tx,
    map_gocardless_tx,
)

ENTITY = Entity(
    id=uuid4(),
    name="Banco Santander",
    natural_id="ES:Banco Santander",
    type=EntityType.FINANCIAL_INSTITUTION,
    origin=EntityOrigin.EXTERNALLY_PROVIDED,
    icon_url=None,
)


def _request(payload=None, provider_instance_id="session"):
    external_entity = ExternalEntity(
        id=uuid4(),
        entity_id=ENTITY.id,
        status=ExternalEntityStatus.LINKED,
        provider=ExternalIntegrationId.ENABLE_BANKING,
        provider_instance_id=provider_instance_id,
        payload=payload,
    )
    return ExternalEntityFetchRequest(external_entity=external_entity, entity=ENTITY)


class TestHistoryStart:
    def test_first_sync_goes_back_two_years(self):
        assert history_start(set(), today=date(2026, 9, 27)) == "2024-09-27"

    def test_incremental_sync_uses_overlap_window(self):
        assert history_start({"ref"}, today=date(2026, 9, 27)) == "2026-06-29"


class TestMapEnableBanking:
    def test_debit_maps_to_transfer_out_with_absolute_amount(self):
        tx = map_enablebanking_tx(
            {
                "entry_reference": "E1",
                "transaction_amount": {"amount": "12.99", "currency": "EUR"},
                "credit_debit_indicator": "DBIT",
                "status": "BOOK",
                "booking_date": "2026-09-12",
                "remittance_information": ["RECIBO NETFLIX"],
                "creditor": {"name": "NETFLIX.COM"},
            },
            "acc-1",
            ENTITY,
        )
        assert tx.ref == "E1"
        assert tx.type == TxType.TRANSFER_OUT
        assert tx.amount == Dezimal("12.99")
        assert tx.product_type == ProductType.ACCOUNT
        assert tx.name == "RECIBO NETFLIX - NETFLIX.COM"
        assert tx.date.date().isoformat() == "2026-09-12"

    def test_credit_maps_to_transfer_in_and_skips_duplicated_counterparty(self):
        tx = map_enablebanking_tx(
            {
                "transaction_amount": {"amount": "2500", "currency": "EUR"},
                "credit_debit_indicator": "CRDT",
                "booking_date": "2026-09-01",
                "remittance_information": ["ABONO NOMINA EMPRESA SL"],
                "debtor": {"name": "Empresa SL"},
            },
            "acc-1",
            ENTITY,
        )
        assert tx.type == TxType.TRANSFER_IN
        assert tx.name == "ABONO NOMINA EMPRESA SL"
        # No bank reference -> deterministic hash
        assert len(tx.ref) == 40

    def test_pending_transactions_are_skipped(self):
        assert (
            map_enablebanking_tx(
                {
                    "transaction_amount": {"amount": "1", "currency": "EUR"},
                    "status": "PDNG",
                    "booking_date": "2026-09-01",
                },
                "acc-1",
                ENTITY,
            )
            is None
        )


class TestMapGoCardless:
    def test_signed_amount_defines_direction(self):
        tx = map_gocardless_tx(
            {
                "transactionId": "G1",
                "bookingDate": "2026-08-10",
                "transactionAmount": {"amount": "-80.00", "currency": "EUR"},
                "remittanceInformationUnstructured": "PAGO EN MERCADONA",
            },
            "acc",
            ENTITY,
        )
        assert tx.type == TxType.TRANSFER_OUT
        assert tx.amount == Dezimal("80.00")
        assert tx.name == "PAGO EN MERCADONA"


class TestEnableBankingFetcherTransactions:
    @pytest.mark.asyncio
    async def test_paginates_and_skips_registered_refs(self):
        client = MagicMock()
        pages = [
            {
                "transactions": [
                    {
                        "entry_reference": "OLD",
                        "transaction_amount": {"amount": "5", "currency": "EUR"},
                        "credit_debit_indicator": "DBIT",
                        "booking_date": "2026-09-01",
                    },
                    {
                        "entry_reference": "NEW1",
                        "transaction_amount": {"amount": "6", "currency": "EUR"},
                        "credit_debit_indicator": "DBIT",
                        "booking_date": "2026-09-02",
                    },
                ],
                "continuation_key": "next",
            },
            {
                "transactions": [
                    {
                        "entry_reference": "NEW2",
                        "transaction_amount": {"amount": "7", "currency": "EUR"},
                        "credit_debit_indicator": "CRDT",
                        "booking_date": "2026-09-03",
                    }
                ]
            },
        ]
        client.get_account_transactions = AsyncMock(side_effect=pages)
        fetcher = EnableBankingFetcher(client)

        result = await fetcher.transactions(
            _request(payload={"accounts": [{"uid": "acc-1"}]}), {"OLD"}
        )

        assert [tx.ref for tx in result.account] == ["NEW1", "NEW2"]
        assert client.get_account_transactions.await_count == 2
        second_call = client.get_account_transactions.await_args_list[1]
        assert second_call.kwargs["continuation_key"] == "next"


class TestGoCardlessFetcherTransactions:
    @pytest.mark.asyncio
    async def test_maps_booked_transactions(self):
        client = MagicMock()
        client.get_requisition = MagicMock(return_value={"accounts": ["a1"]})
        client.get_account_transactions = MagicMock(
            return_value={
                "transactions": {
                    "booked": [
                        {
                            "transactionId": "T1",
                            "bookingDate": "2026-09-05",
                            "transactionAmount": {"amount": "-800", "currency": "EUR"},
                            "remittanceInformationUnstructured": "ALQUILER",
                        }
                    ],
                    "pending": [
                        {
                            "transactionAmount": {"amount": "-1", "currency": "EUR"},
                            "bookingDate": "2026-09-06",
                        }
                    ],
                }
            }
        )
        fetcher = GoCardlessFetcher(client)

        result = await fetcher.transactions(_request(), set())

        assert len(result.account) == 1
        assert result.account[0].ref == "T1"
        assert result.account[0].type == TxType.TRANSFER_OUT
