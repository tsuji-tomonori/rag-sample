import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


def _document(document_id: str, text: str, owner: str = "alice") -> dict[str, object]:
    return {
        "document_id": document_id,
        "version": "1",
        "title": document_id,
        "text": text,
        "owner_subject": owner,
        "allowed_groups": [],
    }


async def test_authentication_is_required(client: AsyncClient) -> None:
    response = await client.post("/v1/search", json={"query": "hours"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"


async def test_ingest_and_search(client: AsyncClient, auth: dict[str, str]) -> None:
    created = await client.post(
        "/v1/documents",
        headers=auth,
        json=_document("support-policy", "Support hours are weekdays from 09:00 to 17:00."),
    )
    assert created.status_code == 201
    assert created.json()["chunk_count"] == 1

    response = await client.post("/v1/search", headers=auth, json={"query": "support hours"})
    assert response.status_code == 200
    assert response.json()["hits"][0]["document_id"] == "support-policy"
    assert set(response.json()["hits"][0]) >= {
        "sparse_score",
        "dense_score",
        "fused_score",
    }


async def test_acl_is_applied_before_search(client: AsyncClient, auth: dict[str, str]) -> None:
    created = await client.post(
        "/v1/documents",
        headers={"Authorization": "Bearer bob"},
        json=_document("secret", "Project Phoenix launch code is ORANGE.", owner="bob"),
    )
    assert created.status_code == 201
    response = await client.post(
        "/v1/search", headers=auth, json={"query": "Phoenix ORANGE", "top_k": 20}
    )
    assert response.status_code == 200
    assert response.json()["hits"] == []


async def test_ingest_cannot_impersonate_an_owner(
    client: AsyncClient, auth: dict[str, str]
) -> None:
    response = await client.post(
        "/v1/documents",
        headers=auth,
        json=_document("forged", "Sensitive content", owner="bob"),
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "access_denied"


async def test_answer_has_citation_and_refuses_weak_evidence(
    client: AsyncClient, auth: dict[str, str]
) -> None:
    await client.post(
        "/v1/documents",
        headers=auth,
        json=_document("security", "Backups use AES-256 encryption."),
    )
    answered = (
        await client.post(
            "/v1/answers", headers=auth, json={"question": "What encryption do backups use?"}
        )
    ).json()
    assert answered["status"] == "answered"
    assert answered["citations"][0]["document_id"] == "security"
    assert answered["citations"][0]["source_text"] in answered["answer"]

    refused = (
        await client.post(
            "/v1/answers", headers=auth, json={"question": "quantum flux capacitor warranty"}
        )
    ).json()
    assert refused["status"] == "insufficient_evidence"
    assert refused["citations"] == []
