import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const infraRoot = path.resolve(__dirname, "..")
const repositoryRoot = path.resolve(infraRoot, "..")

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}

test("builds a Lambda bundle without checkout-specific installer artifacts", () => {
  const bundleId = readFileSync(path.join(infraRoot, "lambda-dist/bundle-path.txt"), "utf8").trim()
  assert.match(bundleId, /^[0-9a-f]{16}$/)

  const bundle = path.join(infraRoot, "lambda-dist", bundleId)
  assert.equal(
    readFileSync(path.join(bundle, ".bundle-complete"), "utf8"),
    `${bundleId}\n`,
  )
  assert.equal(existsSync(path.join(bundle, "bin")), false)

  const files = walk(bundle)
  const installerMetadata = new Set(["direct_url.json", "uv_build.json", "uv_cache.json"])
  const metadataFiles = files.filter(file => installerMetadata.has(path.basename(file)))
  assert.deepEqual(metadataFiles, [])

  const checkoutPath = Buffer.from(repositoryRoot)
  const leaks = files
    .filter(file => readFileSync(file).includes(checkoutPath))
    .map(file => path.relative(bundle, file))
  assert.deepEqual(leaks, [])

  for (const record of files.filter(file => path.basename(file) === "RECORD")) {
    const hostDependentEntry = readFileSync(record, "utf8")
      .split(/\r?\n/)
      .find(line => {
        const entry = line.split(",", 1)[0] ?? ""
        return /^(?:\.\.\/)*bin\//.test(entry) || installerMetadata.has(path.basename(entry))
      })
    assert.equal(hostDependentEntry, undefined, path.relative(bundle, record))
  }
})
