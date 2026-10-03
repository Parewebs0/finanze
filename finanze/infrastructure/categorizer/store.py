import json
import logging
from pathlib import Path

from domain.categorizer import CategorizerConnection, CategorizerProvider
from domain.exception.exceptions import NoUserLogged

FILE_NAME = "categorizer.json"


class CategorizerStore:
    def __init__(self) -> None:
        self._path: Path | None = None
        self._log = logging.getLogger(__name__)

    def connect(self, user_path: Path) -> None:
        self._path = user_path / FILE_NAME

    def disconnect(self) -> None:
        self._path = None

    def _require_path(self) -> Path:
        if self._path is None:
            raise NoUserLogged()
        return self._path

    def load(self) -> CategorizerConnection | None:
        path = self._require_path()
        if not path.is_file():
            return None
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            self._log.warning("Ignoring unreadable categorizer config: %s", error)
            return None
        provider = raw.get("provider")
        api_key = raw.get("apiKey")
        if provider not in {item.value for item in CategorizerProvider}:
            return None
        if not isinstance(api_key, str) or not api_key.strip():
            return None
        return CategorizerConnection(
            provider=CategorizerProvider(provider),
            api_key=api_key.strip(),
        )

    def save(self, connection: CategorizerConnection) -> None:
        path = self._require_path()
        payload = json.dumps(
            {"provider": connection.provider.value, "apiKey": connection.api_key}
        )
        path.write_text(payload, encoding="utf-8")
        path.chmod(0o600)

    def clear(self) -> None:
        path = self._require_path()
        if path.is_file():
            path.unlink()
