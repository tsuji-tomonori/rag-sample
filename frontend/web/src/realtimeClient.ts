export type RealtimeEvent = {
  channel: string
  resourceId: string
  kind: string
  status: string
  requestId: string
}

export interface RealtimeClient {
  subscribe(
    channel: string,
    accessToken: string,
    onEvent: (event: RealtimeEvent) => void,
    onError: (message: string) => void
  ): Promise<() => void>
}

type SocketFactory = (url: string, protocols: string | string[]) => WebSocket

export class AppSyncRealtimeClient implements RealtimeClient {
  private readonly graphqlEndpoint: URL

  public constructor(
    graphqlUrl: string,
    private readonly socketFactory: SocketFactory = (url, protocols) => new WebSocket(url, protocols),
    private readonly idFactory: () => string = () => crypto.randomUUID()
  ) {
    const endpoint = new URL(graphqlUrl)
    if (endpoint.protocol !== "https:" || !endpoint.hostname.includes(".appsync-api.")) {
      throw new Error("AppSync GraphQL URL is invalid")
    }
    this.graphqlEndpoint = endpoint
  }

  public subscribe(
    channel: string,
    accessToken: string,
    onEvent: (event: RealtimeEvent) => void,
    onError: (message: string) => void
  ): Promise<() => void> {
    const realtimeUrl = this.buildRealtimeUrl(accessToken)
    const socket = this.socketFactory(realtimeUrl, "graphql-ws")
    const operationId = this.idFactory()
    return new Promise((resolve, reject) => {
      let started = false
      socket.onopen = () => socket.send(JSON.stringify({ type:"connection_init" }))
      socket.onerror = () => {
        const message = "AppSync WebSocket connection failed"
        if (started) onError(message)
        else reject(new Error(message))
      }
      socket.onmessage = message => {
        const payload = parseMessage(message.data)
        if (payload.type === "connection_ack") {
          socket.send(JSON.stringify({
            id:operationId,
            type:"start",
            payload:{
              data:JSON.stringify({
                query:"subscription OnEvent($channel:String!){onEvent(channel:$channel){channel resourceId kind status requestId}}",
                variables:{ channel }
              }),
              extensions:{ authorization:{ Authorization:accessToken,host:this.graphqlEndpoint.hostname } }
            }
          }))
          started = true
          resolve(() => {
            if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ id:operationId,type:"stop" }))
            socket.close(1000,"subscription complete")
          })
          return
        }
        if (payload.type === "data") {
          const event = extractEvent(payload.payload)
          if (event) onEvent(event)
          return
        }
        if (payload.type === "error") onError("AppSync subscription returned an error")
      }
    })
  }

  private buildRealtimeUrl(accessToken: string): string {
    const endpoint = new URL(this.graphqlEndpoint)
    endpoint.protocol = "wss:"
    endpoint.hostname = endpoint.hostname.replace(".appsync-api.", ".appsync-realtime-api.")
    endpoint.searchParams.set("header",base64Url(JSON.stringify({
      host:this.graphqlEndpoint.hostname,
      Authorization:accessToken
    })))
    endpoint.searchParams.set("payload",base64Url("{}"))
    return endpoint.toString()
  }
}

function parseMessage(value: unknown): { type:string; payload?:unknown } {
  if (typeof value !== "string") return { type:"invalid" }
  const parsed: unknown = JSON.parse(value)
  if (!isRecord(parsed) || typeof parsed.type !== "string") return { type:"invalid" }
  return { type:parsed.type, payload:parsed.payload }
}

function extractEvent(value: unknown): RealtimeEvent | null {
  if (!isRecord(value) || !isRecord(value.data) || !isRecord(value.data.onEvent)) return null
  const event = value.data.onEvent
  return typeof event.channel === "string" && typeof event.resourceId === "string" && typeof event.kind === "string" &&
    typeof event.status === "string" && typeof event.requestId === "string"
    ? { channel:event.channel,resourceId:event.resourceId,kind:event.kind,status:event.status,requestId:event.requestId }
    : null
}

function base64Url(value: string): string {
  return btoa(value).replaceAll("+","-").replaceAll("/","_").replace(/=+$/u,"")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
