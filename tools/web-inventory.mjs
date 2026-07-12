import { readFile, writeFile, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"

const outputDir = "docs/generated"
const featureDir = path.join(outputDir, "web-features")
const source = await readFile("apps/web/src/App.tsx", "utf8")
const contract = JSON.parse(await readFile("apps/web/design-contract.json", "utf8"))
const checkOnly = process.argv.includes("--check")

for (const item of [...contract.views, ...contract.actions]) {
  if (!source.includes(item.label)) throw new Error(`Web design label is missing from App.tsx: ${item.label}`)
}

const featureFor = id => id.toLowerCase().includes("ingest") || id === "knowledge" ? "documents" : id.toLowerCase().includes("answer") || id === "inquiry" ? "answers" : "app"
const features = [...new Set(["app", "auth", "documents", "answers", "realtime", "shared"])]
const components = [...source.matchAll(/(?:export\s+)?function\s+([A-Z][A-Za-z0-9_]*)\s*\(/g)].map(match => ({ name: match[1], file: "apps/web/src/App.tsx", certainty: "confirmed" }))
const controls = [...source.matchAll(/<(button|input|textarea|form)\b([^>]*)>([^<]*)/g)].map((match, index) => ({ id: `UI-${String(index + 1).padStart(3, "0")}`, element: match[1], label: (match[3] || match[2].match(/placeholder="([^"]+)"/)?.[1] || "実行時ラベル").trim(), accessibleName: match[2].match(/aria-label="([^"]+)"/)?.[1] || (match[3] || "label要素または表示テキスト"), certainty: match[3] ? "confirmed" : "inferred" }))
const commonNotice = [
  "> 自動生成: `tools/web-inventory.mjs`",
  ">",
  "> 静的解析による推定を含みます。条件付き表示、権限別表示、実行時データ依存の UI は certainty を確認してください。",
  ">",
  "> 読み方: `confirmed` はコードから直接確認できた情報、`inferred` は契約や構造から推定した情報、`unknown` は静的解析だけでは断定できない情報です。",
  ""
]

const overview = [
  "# Web UI インベントリ概要", ...commonNotice,
  "## この資料で分かること", "", "- 実装済み画面、操作、認証、realtime、主要componentを実装から追跡できます。", "",
  "## 全体サマリ", "", "| 項目 | 件数 |", "| --- | ---: |", `| 画面 | ${contract.views.length} |`, `| 操作 | ${contract.actions.length} |`, `| component | ${components.length} |`, `| UI control | ${controls.length} |`, "",
  "## 初めて見る人向けの導線", "", "1. `web-screens.md` で画面と権限を確認する。", "2. `web-features.md` から機能別詳細へ進む。", "3. `web-accessibility.md` で操作名と状態を確認する。", "",
  "## 生成されるファイル", "", "- `web-overview.md`", "- `web-screens.md`", "- `web-features.md` と `web-features/*.md`", "- `web-components.md`", "- `web-accessibility.md`", "- `web-ui-inventory.json`", ""
].join("\n")

const screens = [
  "# Web 画面一覧", ...commonNotice,
  "## 画面サマリ", "", "| ID | 画面 | Permission | Feature | Certainty |", "| --- | --- | --- | --- | --- |",
  ...contract.views.map(view => `| \`${view.id}\` | ${view.label} | \`${view.permission}\` | [${featureFor(view.id)}](web-features/${featureFor(view.id)}.md) | \`confirmed\` |`), "", "## 画面ごとの説明", "",
  ...contract.views.flatMap(view => [`### ${view.label}`, "", `- View ID: \`${view.id}\``, `- Permission: \`${view.permission}\``, `- 関連機能: [${featureFor(view.id)}](web-features/${featureFor(view.id)}.md)`, `- 表示根拠: \`apps/web/design-contract.json\` / \`apps/web/src/App.tsx\``, ""])
].join("\n")

const featureIndex = [
  "# Web 機能一覧", ...commonNotice, "## 機能別ファイル", "", "| Feature | 説明 | File |", "| --- | --- | --- |",
  ...features.map(feature => `| \`${feature}\` | ${featureDescription(feature)} | [詳細](web-features/${feature}.md) |`), ""
].join("\n")

const componentDoc = [
  "# Web コンポーネント一覧", ...commonNotice, "## コンポーネントサマリ", "", "| Component | Source | Certainty |", "| --- | --- | --- |",
  ...(components.length ? components.map(item => `| \`${item.name}\` | \`${item.file}\` | \`${item.certainty}\` |`) : ["| `App` | `apps/web/src/App.tsx` | `inferred` |"]), ""
].join("\n")

const accessibility = [
  "# Web UI 操作説明一覧", ...commonNotice,
  "## この資料で分かること", "", "- 操作可能要素の表示名、推定accessible name、静的解析確度を確認できます。", "",
  "## 機能別サマリ", "", "| Feature | 操作数 |", "| --- | ---: |", `| \`app\` | ${controls.length} |`, "",
  "## UI 操作説明", "", "| ID | Element | Label | Accessible name | Certainty |", "| --- | --- | --- | --- | --- |",
  ...controls.map(item => `| \`${item.id}\` | \`${item.element}\` | ${item.label || "-"} | ${item.accessibleName} | \`${item.certainty}\` |`), "",
  "## 仕様書での読み替え", "", "- `confirmed` はソース上の表示テキストまたはARIA属性です。", "- `inferred` はlabel構造やcontractからの推定です。", ""
].join("\n")

const inventory = { generatedBy: "tools/web-inventory.mjs", schemaVersion: contract.schemaVersion, views: contract.views.map(view => ({ ...view, feature: featureFor(view.id), certainty: "confirmed" })), actions: contract.actions.map(action => ({ ...action, feature: featureFor(action.id), certainty: "confirmed" })), authModes: contract.authModes, realtime: contract.realtime, components, controls }
const outputs = new Map([
  [path.join(outputDir, "web-overview.md"), overview],
  [path.join(outputDir, "web-screens.md"), screens],
  [path.join(outputDir, "web-features.md"), featureIndex],
  [path.join(outputDir, "web-components.md"), componentDoc],
  [path.join(outputDir, "web-accessibility.md"), accessibility],
  [path.join(outputDir, "web-ui-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`],
  ...features.map(feature => [path.join(featureDir, `${feature}.md`), renderFeature(feature)])
])

if (checkOnly) {
  const stale = []
  for (const [file, body] of outputs) if (!existsSync(file) || await readFile(file, "utf8") !== body) stale.push(file)
  if (stale.length) throw new Error(`Web inventory docs are stale:\n${stale.map(file => `- ${file}`).join("\n")}`)
} else {
  await mkdir(featureDir, { recursive: true })
  for (const [file, body] of outputs) await writeFile(file, body)
}

function featureDescription(feature) {
  return ({ app: "共通application shellと状態管理", auth: "local/Cognito認証境界", documents: "文書登録とingestion状態", answers: "根拠限定回答と引用", realtime: "AppSync ingestion通知", shared: "複数機能で共有するUIと型" })[feature]
}

function renderFeature(feature) {
  const views = contract.views.filter(view => featureFor(view.id) === feature)
  const actions = contract.actions.filter(action => featureFor(action.id) === feature)
  return [
    `# Web feature: ${feature}`, ...commonNotice,
    "## 概要", "", featureDescription(feature), "",
    "## 画面", "", ...(views.length ? views.map(view => `- \`${view.id}\`: ${view.label} (permission: \`${view.permission}\`)`) : ["_専用画面はありません。_"]), "",
    "## 操作", "", ...(actions.length ? actions.map(action => `- \`${action.id}\`: ${action.label} / \`${action.endpoint}\` / states: ${action.states.join(", ")}`) : ["_専用操作はありません。_"]), "",
    "## 実装根拠", "", "- `apps/web/design-contract.json`", "- `apps/web/src/App.tsx`", ""
  ].join("\n")
}
