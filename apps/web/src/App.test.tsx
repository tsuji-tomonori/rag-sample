import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import { App } from "./App.js"
import type { ApiClient } from "./api.js"

test("renders a grounded answer and its source from the API", async () => {
  const client = {
    answer: vi.fn().mockResolvedValue({
      status: "answered",
      answer: "暗号化されています。",
      request_id: "req-1",
      citations: [{ document_id:"security", chunk_id:"security:1:0", title:"Security", source_text:"AES-256", rank:1, score:.03 }]
    }),
    ingest: vi.fn()
  } as unknown as ApiClient
  render(<App client={client} />)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("利用者 ID"), "alice")
  await user.type(screen.getByLabelText("質問"), "暗号方式は？")
  await user.click(screen.getByRole("button", { name:"回答を検証する" }))
  expect(await screen.findByText("暗号化されています。")).toBeInTheDocument()
  expect(screen.getByText("Security")).toBeInTheDocument()
  expect(client.answer).toHaveBeenCalledWith("暗号方式は？", { subject:"alice", groups:[] })
})
