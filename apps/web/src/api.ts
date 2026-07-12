import {
  apiErrorMessage,
  isAnswerResponse,
  isIngestResponse,
  type AnswerResponse,
  type IngestRequest,
  type IngestResponse
} from "@rag-engineering/contract"

export type Session = { subject: string; groups: string[] }

export class ApiClient {
  public constructor(private readonly baseUrl = "") {}

  public async ingest(request: IngestRequest, session: Session): Promise<IngestResponse> {
    const value = await this.request("/v1/documents", request, session)
    if (!isIngestResponse(value)) throw new Error("取込 API の応答形式が不正です")
    return value
  }

  public async answer(question: string, session: Session): Promise<AnswerResponse> {
    const value = await this.request("/v1/answers", { question, top_k: 5 }, session)
    if (!isAnswerResponse(value)) throw new Error("回答 API の応答形式が不正です")
    return value
  }

  private async request(path: string, body: unknown, session: Session): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.subject}`,
        "X-Principal-Groups": session.groups.join(",")
      },
      body: JSON.stringify(body)
    })
    const value: unknown = await response.json().catch(() => null)
    if (!response.ok) throw new Error(apiErrorMessage(value, `API request failed (${response.status})`))
    return value
  }
}

