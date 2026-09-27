from quart import jsonify, request

from application.use_cases.categorizer import (
    CategorizerNotConnected,
    CategorizerService,
)
from domain.categorizer import CategorizerPayment, CategorizerProvider
from domain.exception.exceptions import NoUserLogged
from infrastructure.categorizer.jev_client import CategorizerRequestError


def _status_body(status) -> dict:
    return {
        "connected": status.connected,
        "provider": status.provider.value if status.provider else None,
        "keyHint": status.key_hint,
    }


async def get_categorizer(service: CategorizerService):
    try:
        return jsonify(_status_body(service.status())), 200
    except NoUserLogged:
        return jsonify({"message": "Not logged in"}), 401


async def connect_categorizer(service: CategorizerService):
    body = await request.get_json()
    if not isinstance(body, dict):
        return jsonify({"message": "Expected a JSON object"}), 400
    provider_raw = body.get("provider")
    api_key = body.get("apiKey")
    if provider_raw not in {item.value for item in CategorizerProvider}:
        return jsonify({"message": "Choose OpenRouter or Jev direct"}), 400
    if not isinstance(api_key, str) or len(api_key.strip()) < 8:
        return jsonify({"message": "API key is too short"}), 400
    try:
        status = await service.connect(CategorizerProvider(provider_raw), api_key)
    except NoUserLogged:
        return jsonify({"message": "Not logged in"}), 401
    except CategorizerRequestError as error:
        return jsonify({"message": str(error)}), error.status
    return jsonify(_status_body(status)), 200


async def disconnect_categorizer(service: CategorizerService):
    try:
        service.disconnect()
    except NoUserLogged:
        return jsonify({"message": "Not logged in"}), 401
    return "", 204


async def categorize_payments(service: CategorizerService):
    body = await request.get_json()
    raw_payments = body.get("transactions") if isinstance(body, dict) else None
    if not isinstance(raw_payments, list) or not raw_payments:
        return jsonify({"message": "No payments to categorize"}), 400

    payments: list[CategorizerPayment] = []
    for item in raw_payments:
        if not isinstance(item, dict) or not item.get("id"):
            return jsonify({"message": "Each payment needs an id"}), 400
        try:
            amount = float(item.get("amount", 0))
        except (TypeError, ValueError):
            return jsonify({"message": "Invalid amount"}), 400
        payments.append(
            CategorizerPayment(
                id=str(item["id"])[:80],
                concept=str(item.get("concept") or "")[:300],
                amount=amount,
                currency=str(item.get("currency") or "EUR")[:8],
                date=str(item.get("date") or "")[:40],
                entity_name=str(item.get("entityName") or "")[:80],
            )
        )

    try:
        assigned = await service.categorize(payments)
    except NoUserLogged:
        return jsonify({"message": "Not logged in"}), 401
    except CategorizerNotConnected:
        return jsonify({"message": "Connect Jev before categorizing"}), 409
    except ValueError as error:
        return jsonify({"message": str(error)}), 400
    except CategorizerRequestError as error:
        return jsonify({"message": str(error)}), error.status

    return jsonify(
        {
            "assignments": [
                {
                    "id": item.id,
                    "category": item.category,
                    "confidence": item.confidence,
                }
                for item in assigned
            ]
        }
    ), 200
