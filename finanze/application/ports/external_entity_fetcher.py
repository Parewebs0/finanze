import abc

from domain.exception.exceptions import FeatureNotSupported
from domain.external_entity import (
    ExternalEntity,
    ExternalEntityConnectionResult,
    ExternalEntityFetchRequest,
    ExternalEntityLinkCompletion,
    ExternalEntityLoginRequest,
    ProviderExternalEntityDetails,
)
from domain.external_integration import EnabledExternalIntegrations
from domain.global_position import GlobalPosition
from domain.transactions import Transactions


class ExternalEntityFetcher(metaclass=abc.ABCMeta):
    async def setup(self, integrations: EnabledExternalIntegrations):
        raise NotImplementedError

    async def create_or_link(
        self, request: ExternalEntityLoginRequest
    ) -> ExternalEntityConnectionResult:
        raise NotImplementedError

    async def unlink(self, provider_instance_id: str):
        raise NotImplementedError

    async def is_linked(self, provider_instance_id: str) -> bool:
        raise NotImplementedError

    async def complete_link(
        self, external_entity: ExternalEntity, callback_payload: dict
    ) -> ExternalEntityLinkCompletion:
        linked = await self.is_linked(external_entity.provider_instance_id)
        return ExternalEntityLinkCompletion(linked=linked)

    async def get_entity(
        self, provider_entity_id: str
    ) -> ProviderExternalEntityDetails:
        raise NotImplementedError

    async def get_entities(self, **kwargs) -> list[ProviderExternalEntityDetails]:
        raise NotImplementedError

    async def global_position(
        self, request: ExternalEntityFetchRequest
    ) -> GlobalPosition:
        raise FeatureNotSupported

    async def transactions(
        self, request: ExternalEntityFetchRequest, registered_refs: set[str]
    ) -> Transactions:
        """Fetch booked account transactions (PSD2 account information).

        Implementations should skip transactions whose ref is already in
        ``registered_refs``. Providers that can't return transactions keep
        raising ``FeatureNotSupported`` and only the position is stored.
        """
        raise FeatureNotSupported
