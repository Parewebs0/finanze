from domain.categorizer import (
    CategorizerAssignment,
    CategorizerConnection,
    CategorizerPayment,
    CategorizerProvider,
    CategorizerStatus,
)
from domain.exception.exceptions import NoUserLogged
from infrastructure.categorizer.jev_client import JevCategorizerClient, key_hint
from infrastructure.categorizer.store import CategorizerStore

MAX_PAYMENTS = 200


class CategorizerNotConnected(Exception):
    pass


class CategorizerService:
    def __init__(self, store: CategorizerStore, client: JevCategorizerClient):
        self._store = store
        self._client = client

    def status(self) -> CategorizerStatus:
        connection = self._load()
        if connection is None:
            return CategorizerStatus(connected=False)
        return CategorizerStatus(
            connected=True,
            provider=connection.provider,
            key_hint=key_hint(connection.api_key),
        )

    async def connect(
        self, provider: CategorizerProvider, api_key: str
    ) -> CategorizerStatus:
        connection = CategorizerConnection(provider=provider, api_key=api_key.strip())
        await self._client.verify(connection)
        self._store.save(connection)
        return CategorizerStatus(
            connected=True,
            provider=connection.provider,
            key_hint=key_hint(connection.api_key),
        )

    def disconnect(self) -> None:
        self._store.clear()

    async def categorize(
        self, payments: list[CategorizerPayment], context_notes: str | None = None
    ) -> list[CategorizerAssignment]:
        if len(payments) > MAX_PAYMENTS:
            raise ValueError(f"At most {MAX_PAYMENTS} payments can be categorized")
        if any(not payment.id.strip() for payment in payments):
            raise ValueError("Each payment needs an id")
        connection = self._load()
        if connection is None:
            raise CategorizerNotConnected()
        return await self._client.categorize(connection, payments, context_notes)

    def _load(self) -> CategorizerConnection | None:
        try:
            return self._store.load()
        except NoUserLogged:
            raise
