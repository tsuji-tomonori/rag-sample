import { expect, test } from "@playwright/test"

test("ingests evidence and renders a grounded answer with its citation", async ({ page }) => {
  const authorizationHeaders: string[] = []
  await page.route("**/v1/documents", async route => {
    authorizationHeaders.push((await route.request().allHeaders()).authorization ?? "")
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ document_id:"policy", version:"1", chunk_count:1, request_id:"request-ingest" })
    })
  })
  await page.route("**/v1/answers", async route => {
    authorizationHeaders.push((await route.request().allHeaders()).authorization ?? "")
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status:"answered",
        answer:"受付時間は平日の09:00から17:00です。",
        request_id:"request-answer",
        citations:[{
          document_id:"policy", chunk_id:"policy:1:0", title:"サポート規程",
          source_text:"受付時間は平日の09:00から17:00です。", rank:1, score:0.032
        }]
      })
    })
  })

  await page.goto("/")
  await page.getByLabel("利用者 ID").fill("e2e-user")
  await page.getByLabel("グループ").fill("admin")
  await page.getByLabel("文書 ID").fill("policy")
  await page.getByLabel("版").fill("1")
  await page.getByLabel("タイトル").fill("サポート規程")
  await page.getByLabel("本文").fill("受付時間は平日の09:00から17:00です。")
  await page.getByRole("button", { name:"文書を取り込む" }).click()
  await expect(page.getByText("version 1 / 1 chunks")).toBeVisible()

  await page.getByLabel("質問").fill("受付時間を教えてください")
  await page.getByRole("button", { name:"回答を検証する" }).click()
  await expect(page.getByText("受付時間は平日の09:00から17:00です。").first()).toBeVisible()
  await expect(page.getByText("サポート規程")).toBeVisible()
  expect(authorizationHeaders).toEqual(["Bearer e2e-user", "Bearer e2e-user"])
})
