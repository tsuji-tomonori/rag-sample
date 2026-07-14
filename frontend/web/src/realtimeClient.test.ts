import { expect, test, vi } from "vitest"
import { AppSyncRealtimeClient } from "./realtimeClient.js"

test("subscribes with Cognito authorization and emits typed AppSync events", async () => {
  const sent: string[] = []
  let connectedUrl = ""
  const socket = {
    onopen:null,
    onerror:null,
    onmessage:null,
    readyState:1,
    send:vi.fn((value:string) => sent.push(value)),
    close:vi.fn()
  } as unknown as WebSocket
  const client = new AppSyncRealtimeClient(
    "https://abc.appsync-api.ap-northeast-1.amazonaws.com/graphql",
    url => { connectedUrl = url; return socket },
    () => "operation-1"
  )
  const onEvent = vi.fn()
  const subscription = client.subscribe("user-1","access-token",onEvent,vi.fn())
  const header = new URL(connectedUrl).searchParams.get("header") ?? ""
  const decodedHeader = JSON.parse(atob(header.replaceAll("-","+").replaceAll("_","/")))
  expect(decodedHeader.Authorization).toBe("access-token")
  socket.onopen?.(new Event("open"))
  socket.onmessage?.(new MessageEvent("message",{ data:JSON.stringify({ type:"connection_ack" }) }))
  const unsubscribe = await subscription
  const startMessage = sent.at(1)
  expect(startMessage).toBeDefined()
  if (!startMessage) throw new Error("subscription start message was not sent")
  expect(JSON.parse(startMessage).payload.extensions.authorization.Authorization).toBe("access-token")
  socket.onmessage?.(new MessageEvent("message",{ data:JSON.stringify({
    type:"data",payload:{ data:{ onEvent:{ channel:"user-1",resourceId:"document-1",kind:"INGESTION",status:"STARTED",requestId:"job-1" } } }
  }) }))
  expect(onEvent).toHaveBeenCalledWith({ channel:"user-1",resourceId:"document-1",kind:"INGESTION",status:"STARTED",requestId:"job-1" })
  unsubscribe()
  expect(socket.close).toHaveBeenCalled()
})
