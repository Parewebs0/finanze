import logging
from typing import Any

import httpx

from domain.categorizer import (
    CATEGORY_CRITERIA,
    CATEGORY_IDS,
    CategorizerAssignment,
    CategorizerConnection,
    CategorizerPayment,
    CategorizerProvider,
)

BATCH_SIZE = 12

ENDPOINTS = {
    CategorizerProvider.OPENROUTER: (
        "https://openrouter.ai/api/v1/systemone",
        "~typesafe/jev-latest",
    ),
    CategorizerProvider.DIRECT: (
        "https://api.typesafe.ai/v1/systemone",
        "jev-latest",
    ),
}


class CategorizerRequestError(Exception):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


def key_hint(api_key: str) -> str:
    trimmed = api_key.strip()
    if len(trimmed) <= 4:
        return "••••"
    return f"••••{trimmed[-4:]}"


def choice_question(payment_id: str) -> dict[str, Any]:
    path = f"payments.{payment_id}"
    return {
        "type": "choice",
        "instructions": (
            f"Choose the category of `{path}`. "
            f"Use `{path}.concept` (bank description, often Spanish), "
            f"`{path}.amount` (negative leaves the account, positive comes in), "
            f"`{path}.date` and `{path}.entity`. "
            "Payroll and wages are salary. Transfers between the user's own "
            "accounts are ownTransfer. If none fits, use uncategorized."
        ),
        "criteria": CATEGORY_CRITERIA,
    }


def assignments_from_answers(
    answers: dict[str, Any], payment_ids: list[str]
) -> list[CategorizerAssignment]:
    assigned: list[CategorizerAssignment] = []
    for payment_id in payment_ids:
        answer = answers.get(payment_id)
        if not isinstance(answer, dict):
            continue
        choice = answer.get("choice")
        if choice not in CATEGORY_IDS:
            continue
        confidence = answer.get("confidence")
        assigned.append(
            CategorizerAssignment(
                id=payment_id,
                category=choice,
                confidence=float(confidence)
                if isinstance(confidence, (int, float))
                else None,
            )
        )
    return assigned


class JevCategorizerClient:
    def __init__(self) -> None:
        self._log = logging.getLogger(__name__)

    async def verify(self, connection: CategorizerConnection) -> None:
        await self._post(
            connection,
            "connection check",
            {
                "ok": {
                    "type": "noul",
                    "instructions": "Is this text a connection check?",
                }
            },
        )

    async def categorize(
        self,
        connection: CategorizerConnection,
        payments: list[CategorizerPayment],
    ) -> list[CategorizerAssignment]:
        assigned: list[CategorizerAssignment] = []
        for start in range(0, len(payments), BATCH_SIZE):
            batch = payments[start : start + BATCH_SIZE]
            state = {
                "payments": {
                    payment.id: {
                        "date": payment.date,
                        "concept": payment.concept[:300],
                        "amount": payment.amount,
                        "currency": payment.currency,
                        "entity": payment.entity_name,
                    }
                    for payment in batch
                }
            }
            questions = {payment.id: choice_question(payment.id) for payment in batch}
            body = await self._post(connection, state, questions)
            answers = body.get("answers")
            if not isinstance(answers, dict):
                raise CategorizerRequestError("Jev returned no answers")
            assigned.extend(
                assignments_from_answers(answers, [payment.id for payment in batch])
            )
        return assigned

    async def _post(
        self,
        connection: CategorizerConnection,
        state: Any,
        questions: dict[str, Any],
    ) -> dict[str, Any]:
        url, model = ENDPOINTS[connection.provider]
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                response = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {connection.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={"model": model, "state": state, "questions": questions},
                )
        except httpx.HTTPError as error:
            self._log.warning("Jev request failed: %s", error)
            raise CategorizerRequestError("Could not reach Jev") from error

        if response.status_code >= 400:
            message = _error_message(response)
            status = 401 if response.status_code in (401, 403) else 502
            raise CategorizerRequestError(message, status)

        try:
            body = response.json()
        except ValueError as error:
            raise CategorizerRequestError("Jev returned an invalid response") from error
        if not isinstance(body, dict):
            raise CategorizerRequestError("Jev returned an invalid response")
        return body


def _error_message(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return f"Jev rejected the request ({response.status_code})"
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict) and error.get("message"):
            return str(error["message"])
        detail = body.get("detail")
        if isinstance(detail, str):
            return detail
        message = body.get("message")
        if isinstance(message, str):
            return message
    return f"Jev rejected the request ({response.status_code})"
