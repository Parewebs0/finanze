from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID

from domain.entity import Entity, EntityType, Feature
from domain.external_integration import (
    ExternalIntegrationId,
)
from pydantic.dataclasses import dataclass


class ExternalEntityStatus(str, Enum):
    UNLINKED = "UNLINKED"
    LINKED = "LINKED"
    ORPHAN = "ORPHAN"


@dataclass
class ExternalEntity:
    id: UUID
    entity_id: UUID
    status: ExternalEntityStatus
    provider: ExternalIntegrationId
    date: Optional[datetime] = None
    provider_instance_id: Optional[str] = None
    payload: Optional[dict] = None


EXTERNAL_ENTITY_FEATURES = [Feature.POSITION, Feature.TRANSACTIONS]


@dataclass
class ProviderExternalEntityDetails:
    id: str
    name: str
    bic: str
    type: EntityType
    icon: Optional[str]
