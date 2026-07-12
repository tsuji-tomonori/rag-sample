import { useEffect, useMemo, useState, type FormEvent } from "react"
import type { AnswerResponse, IngestRequest, IngestResponse } from "@rag-engineering/contract"
import { ApiClient, type Session } from "./api.js"
import { CognitoAuthClient, type AuthClient, type WebSession } from "./authClient.js"
import { runtimeConfig, type RuntimeConfig } from "./runtimeConfig.js"

type Busy = "idle" | "ingesting" | "answering"

const defaultConfig = runtimeConfig()

export function App({
  client = new ApiClient(defaultConfig.apiBaseUrl),
  config = defaultConfig,
  authClient
}: {
  client?: ApiClient
  config?: RuntimeConfig
  authClient?: AuthClient | null
}) {
  const [subject, setSubject] = useState("")
  const [groups, setGroups] = useState("")
  const [document, setDocument] = useState<IngestRequest>({
    document_id: "",
    version: "",
    title: "",
    text: "",
    owner_subject: "",
    allowed_groups: []
  })
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<AnswerResponse | null>(null)
  const [ingested, setIngested] = useState<IngestResponse | null>(null)
  const [busy, setBusy] = useState<Busy>("idle")
  const [error, setError] = useState<string | null>(null)
  const [webSession, setWebSession] = useState<WebSession | null>(null)
  const [authLoading, setAuthLoading] = useState(config.authMode === "cognito")
  const resolvedAuthClient = useMemo(
    () => authClient ?? (config.authMode === "cognito" ? new CognitoAuthClient(config) : null),
    [authClient, config]
  )
  const localSession = useMemo<Session>(
    () => ({
      subject: subject.trim(),
      groups: groups.split(",").map(item => item.trim()).filter(Boolean),
      accessToken: subject.trim(),
      local: true
    }),
    [groups, subject]
  )
  const session: Session = config.authMode === "local"
    ? localSession
    : { subject: webSession?.subject ?? "", groups: webSession?.groups ?? [], accessToken: webSession?.accessToken ?? "", local: false }
  const authenticated = session.subject.length > 0

  useEffect(() => {
    if (config.authMode !== "cognito" || !resolvedAuthClient) return
    const activeAuthClient = resolvedAuthClient
    let active = true
    async function restoreSession() {
      try {
        const callback = window.location.pathname === "/auth/callback"
        const restored = callback
          ? await activeAuthClient.completeSignIn()
          : await activeAuthClient.currentSession()
        if (active) setWebSession(restored)
        if (callback) window.history.replaceState({}, "", "/")
      } catch (caught) {
        if (active) setError(errorMessage(caught))
      } finally {
        if (active) setAuthLoading(false)
      }
    }
    void restoreSession()
    return () => { active = false }
  }, [config.authMode, resolvedAuthClient])

  function beginSignIn() {
    if (resolvedAuthClient) void resolvedAuthClient.signIn().catch(caught => setError(errorMessage(caught)))
  }

  function beginSignOut() {
    if (resolvedAuthClient) void resolvedAuthClient.signOut().catch(caught => setError(errorMessage(caught)))
  }

  async function ingest(event: FormEvent) {
    event.preventDefault()
    if (!authenticated) return setError("利用者 ID を入力してください")
    setBusy("ingesting")
    setError(null)
    try {
      const request = { ...document, owner_subject: document.owner_subject || session.subject }
      setIngested(await client.ingest(request, session))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy("idle")
    }
  }

  async function ask(event: FormEvent) {
    event.preventDefault()
    if (!authenticated) return setError("利用者 ID を入力してください")
    setBusy("answering")
    setError(null)
    setAnswer(null)
    try {
      setAnswer(await client.answer(question, session))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy("idle")
    }
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div className="brand-mark" aria-hidden="true">E</div>
        <div><p className="eyebrow">RAG ENGINEERING WORKSPACE</p><h1>Evidence Desk</h1></div>
        {config.authMode === "local" ? <div className="session-fields" aria-label="ローカル認証">
          <label>利用者 ID<input value={subject} onChange={event => setSubject(event.target.value)} placeholder="必須" /></label>
          <label>グループ<input value={groups} onChange={event => setGroups(event.target.value)} placeholder="カンマ区切り" /></label>
        </div> : <div className="cognito-session">
          {authLoading ? <span>認証状態を確認中</span> : authenticated ? <><span>{session.subject}</span><button type="button" onClick={beginSignOut}>サインアウト</button></> : <button type="button" onClick={beginSignIn}>Cognitoでサインイン</button>}
        </div>}
      </header>

      {error && <div className="error-banner" role="alert">{error}</div>}
      <section className="workspace">
        <aside className="ingest-panel">
          <div className="section-heading"><span>01</span><div><p>KNOWLEDGE</p><h2>根拠を登録する</h2></div></div>
          <p className="help">文書の識別子、版、ACL と原文をそのまま索引へ送ります。</p>
          <form onSubmit={event => void ingest(event)}>
            <div className="field-row">
              <label>文書 ID<input required value={document.document_id} onChange={event => setDocument({ ...document, document_id: event.target.value })} /></label>
              <label>版<input required value={document.version} onChange={event => setDocument({ ...document, version: event.target.value })} /></label>
            </div>
            <label>タイトル<input required value={document.title} onChange={event => setDocument({ ...document, title: event.target.value })} /></label>
            <label>所有者<input value={document.owner_subject} onChange={event => setDocument({ ...document, owner_subject: event.target.value })} placeholder="空欄なら現在の利用者" /></label>
            <label>許可グループ<input value={document.allowed_groups.join(",")} onChange={event => setDocument({ ...document, allowed_groups: event.target.value.split(",").map(item => item.trim()).filter(Boolean) })} /></label>
            <label>本文<textarea required rows={11} value={document.text} onChange={event => setDocument({ ...document, text: event.target.value })} /></label>
            <button disabled={busy !== "idle"}>{busy === "ingesting" ? "索引を構築中..." : "文書を取り込む"}</button>
          </form>
          {ingested && <div className="receipt" role="status"><strong>{ingested.document_id}</strong><span>version {ingested.version} / {ingested.chunk_count} chunks</span><small>request {ingested.request_id}</small></div>}
        </aside>

        <section className="answer-panel">
          <div className="section-heading"><span>02</span><div><p>INQUIRY</p><h2>根拠から回答する</h2></div></div>
          <form className="question-form" onSubmit={event => void ask(event)}>
            <label className="sr-only" htmlFor="question">質問</label>
            <textarea id="question" required rows={3} value={question} onChange={event => setQuestion(event.target.value)} placeholder="登録した資料について質問してください" />
            <button disabled={busy !== "idle"}>{busy === "answering" ? "根拠を照合中..." : "回答を検証する"}</button>
          </form>
          {!answer && <div className="empty-state"><span>∴</span><p>回答と引用はまだありません。<br />登録済みの根拠へ質問すると、ここに検証可能な結果を表示します。</p></div>}
          {answer && <article className={`answer-card ${answer.status}`}>
            <header><span className="status-chip">{answer.status === "answered" ? "GROUNDED" : "ABSTAINED"}</span><small>request {answer.request_id}</small></header>
            <p className="answer-text">{answer.answer}</p>
            {answer.citations.length > 0 && <section className="citations"><h3>引用された根拠</h3>{answer.citations.map(citation => <details key={citation.chunk_id}>
              <summary><span>{String(citation.rank).padStart(2, "0")}</span><strong>{citation.title}</strong><small>score {citation.score.toFixed(4)}</small></summary>
              <blockquote>{citation.source_text}</blockquote><code>{citation.document_id} / {citation.chunk_id}</code>
            </details>)}</section>}
          </article>}
        </section>
      </section>
    </main>
  )
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : "予期しないエラーが発生しました"
}
