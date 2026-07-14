export type Citation = {
  document_id: string
  chunk_id: string
  title: string
  source_text: string
  rank: number
  score: number
}

export type AnswerResponse = {
  status: "answered" | "insufficient_evidence"
  answer: string
  citations: Citation[]
  request_id: string
}

export type IngestRequest = {
  document_id: string
  version: string
  title: string
  text: string
  owner_subject: string
  allowed_groups: string[]
}

export type IngestResponse = {
  document_id: string
  version: string
  chunk_count: number
  request_id: string
}

export type ApiError = { error: { code: string; message: string; request_id: string } }

export function isAnswerResponse(value: unknown): value is AnswerResponse {
  if (!isRecord(value)) return false
  return (
    (value.status === "answered" || value.status === "insufficient_evidence") &&
    typeof value.answer === "string" &&
    Array.isArray(value.citations) &&
    value.citations.every(isCitation) &&
    typeof value.request_id === "string"
  )
}

export function isIngestResponse(value: unknown): value is IngestResponse {
  return (
    isRecord(value) &&
    typeof value.document_id === "string" &&
    typeof value.version === "string" &&
    typeof value.chunk_count === "number" &&
    typeof value.request_id === "string"
  )
}

export function apiErrorMessage(value: unknown, fallback: string): string {
  if (!isRecord(value) || !isRecord(value.error) || typeof value.error.message !== "string") {
    return fallback
  }
  return value.error.message
}

function isCitation(value: unknown): value is Citation {
  return (
    isRecord(value) &&
    typeof value.document_id === "string" &&
    typeof value.chunk_id === "string" &&
    typeof value.title === "string" &&
    typeof value.source_text === "string" &&
    typeof value.rank === "number" &&
    typeof value.score === "number"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

