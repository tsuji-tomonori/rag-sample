import { describe, expect, test } from "vitest"
import { apiErrorMessage, isAnswerResponse, isIngestResponse } from "./index.js"

describe("API runtime contract", () => {
  test("accepts complete answer and ingest responses", () => {
    expect(
      isAnswerResponse({
        status: "answered",
        answer: "grounded",
        request_id: "request-1",
        citations: [
          {
            document_id: "document-1",
            chunk_id: "chunk-1",
            title: "Policy",
            source_text: "grounded source",
            rank: 1,
            score: 0.03
          }
        ]
      })
    ).toBe(true)
    expect(
      isIngestResponse({ document_id: "document-1", version: "1", chunk_count: 2, request_id: "request-1" })
    ).toBe(true)
  })

  test("rejects incomplete responses and safely extracts API errors", () => {
    expect(isAnswerResponse({ status: "answered", answer: "missing citations" })).toBe(false)
    expect(isIngestResponse({ document_id: "document-1", chunk_count: "2" })).toBe(false)
    expect(apiErrorMessage({ error: { message: "denied" } }, "fallback")).toBe("denied")
    expect(apiErrorMessage(null, "fallback")).toBe("fallback")
  })
})
