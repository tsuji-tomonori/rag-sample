import json
from typing import Any

import pytest

from app.adapters.aws import (
    AppSyncEventPublisher,
    AwsKnowledgeBaseConfig,
    AwsKnowledgeBaseStore,
    BedrockConverseGenerator,
)
from app.domain import Chunk, Principal, RankedChunk


class FakeAwsClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.retrieve_response: dict[str, Any] = {"retrievalResults": []}
        self.converse_response: dict[str, Any] = {
            "output": {"message": {"content": [{"text": "根拠に基づく回答"}]}}
        }

    def put_object(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(("put_object", kwargs))
        return {}

    def start_ingestion_job(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(("start_ingestion_job", kwargs))
        return {}

    def retrieve(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(("retrieve", kwargs))
        return self.retrieve_response

    def converse(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(("converse", kwargs))
        return self.converse_response


def _config() -> AwsKnowledgeBaseConfig:
    return AwsKnowledgeBaseConfig("ap-northeast-1", "source", "kb-1", "ds-1", "model-1")


def _chunk() -> Chunk:
    return Chunk(
        "doc:1:0",
        "doc",
        "1",
        "Policy",
        "authorized text",
        0,
        "alice",
        frozenset({"support"}),
        (),
    )


def test_aws_store_writes_source_acl_metadata_and_starts_ingestion() -> None:
    client = FakeAwsClient()
    store = AwsKnowledgeBaseStore(
        config=_config(), s3=client, bedrock_agent=client, bedrock_runtime=client
    )
    store.replace_document("doc", (_chunk(),))
    assert [name for name, _ in client.calls] == [
        "put_object",
        "put_object",
        "start_ingestion_job",
    ]
    metadata = json.loads(client.calls[1][1]["Body"])
    assert metadata["metadataAttributes"]["owner_subject"] == "alice"
    assert metadata["metadataAttributes"]["allowed_groups"] == ["support"]


def test_aws_store_rejects_metadata_over_s3_vectors_limit() -> None:
    client = FakeAwsClient()
    store = AwsKnowledgeBaseStore(
        config=_config(), s3=client, bedrock_agent=client, bedrock_runtime=client
    )
    oversized = Chunk(
        "doc:1:0",
        "doc",
        "1",
        "x" * 1100,
        "text",
        0,
        "alice",
        frozenset(),
        (),
    )
    with pytest.raises(ValueError, match="exceeds 1 KB"):
        store.replace_document("doc", (oversized,))
    assert client.calls == []


def test_aws_search_filters_before_retrieval_and_drops_unauthorized_results() -> None:
    client = FakeAwsClient()
    client.retrieve_response = {
        "retrievalResults": [
            {
                "content": {"text": "denied"},
                "metadata": {
                    "document_id": "secret",
                    "version": "1",
                    "title": "Secret",
                    "owner_subject": "bob",
                    "allowed_groups": [],
                },
                "score": 0.9,
            },
            {
                "content": {"text": "allowed"},
                "metadata": {
                    "document_id": "policy",
                    "version": "1",
                    "title": "Policy",
                    "owner_subject": "bob",
                    "allowed_groups": ["support"],
                },
                "score": 0.8,
            },
        ]
    }
    store = AwsKnowledgeBaseStore(
        config=_config(), s3=client, bedrock_agent=client, bedrock_runtime=client
    )
    results = store.search(
        principal=Principal("alice", frozenset({"support"})),
        query="policy",
        query_embedding=(),
        limit=5,
    )
    request = client.calls[0][1]
    acl_filter = request["retrievalConfiguration"]["vectorSearchConfiguration"]["filter"]
    assert "orAll" in acl_filter
    assert [item.chunk.document_id for item in results] == ["policy"]


def test_bedrock_generator_sends_only_supplied_evidence() -> None:
    client = FakeAwsClient()
    generator = BedrockConverseGenerator(model_id="model-1", client=client)
    ranked = RankedChunk(_chunk(), 0, 0.8, 0.03, 1)
    assert generator.generate("question", (ranked,)) == "根拠に基づく回答"
    payload = client.calls[0][1]
    assert "authorized text" in payload["messages"][0]["content"][0]["text"]


def test_appsync_publisher_sends_typed_ingestion_event() -> None:
    bodies: list[bytes] = []
    publisher = AppSyncEventPublisher(
        endpoint="https://example.appsync-api.ap-northeast-1.amazonaws.com/graphql",
        region="ap-northeast-1",
        post=bodies.append,
    )
    publisher.publish(
        channel="user-1",
        resource_id="document-1",
        kind="INGESTION",
        status="STARTED",
        request_id="job-1",
    )
    payload = json.loads(bodies[0])
    assert payload["variables"] == {
        "channel": "user-1",
        "resourceId": "document-1",
        "kind": "INGESTION",
        "status": "STARTED",
        "requestId": "job-1",
    }


def test_appsync_publisher_rejects_non_aws_endpoint() -> None:
    with pytest.raises(ValueError, match="AWS regional"):
        AppSyncEventPublisher(
            endpoint="https://attacker.invalid/graphql",
            region="ap-northeast-1",
            post=lambda _body: None,
        )
