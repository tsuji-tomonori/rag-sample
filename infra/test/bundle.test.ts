import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const infraRoot = path.resolve(__dirname, "..")
const repositoryRoot = path.resolve(infraRoot, "..")

function canonicalPackageName(value: string): string {
  return value.toLowerCase().replace(/[-_.]+/g, "-")
}

function lockedPackageVersions(): Map<string, Set<string>> {
  const value = readFileSync(path.join(repositoryRoot, "uv.lock"), "utf8")
  const result = new Map<string, Set<string>>()
  for (const block of value.split("[[package]]").slice(1)) {
    const name = block.match(/^name = "([^"]+)"$/m)?.[1]
    const version = block.match(/^version = "([^"]+)"$/m)?.[1]
    if (name === undefined || version === undefined) continue
    const key = canonicalPackageName(name)
    const versions = result.get(key) ?? new Set<string>()
    versions.add(version)
    result.set(key, versions)
  }
  return result
}

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
  assert.equal(existsSync(path.join(bundle, ".lock")), false)
  assert.equal(existsSync(path.join(bundle, "app/lambda_handler.py")), true)

  const files = walk(bundle)
  assert.deepEqual(
    files.filter(file => file.endsWith(".pyc") || file.split(path.sep).includes("__pycache__")),
    [],
  )
  const installerMetadata = new Set(["direct_url.json", "uv_build.json", "uv_cache.json"])
  const metadataFiles = files.filter(file => installerMetadata.has(path.basename(file)))
  assert.deepEqual(metadataFiles, [])

  const checkoutPath = Buffer.from(repositoryRoot)
  const leaks = files
    .filter(file => readFileSync(file).includes(checkoutPath))
    .map(file => path.relative(bundle, file))
  assert.deepEqual(leaks, [])

  const lockedVersions = lockedPackageVersions()
  const distributionMetadata = files.filter(
    file =>
      path.basename(file) === "METADATA" && path.basename(path.dirname(file)).endsWith(".dist-info"),
  )
  assert.ok(distributionMetadata.length > 0)
  for (const metadata of distributionMetadata) {
    const value = readFileSync(metadata, "utf8")
    const name = value.match(/^Name: (.+)$/m)?.[1]
    const version = value.match(/^Version: (.+)$/m)?.[1]
    assert.notEqual(name, undefined, path.relative(bundle, metadata))
    assert.notEqual(version, undefined, path.relative(bundle, metadata))
    const accepted = lockedVersions.get(canonicalPackageName(name ?? ""))
    assert.equal(
      accepted?.has(version ?? ""),
      true,
      `${name ?? "unknown"}==${version ?? "unknown"} is absent from uv.lock`,
    )
  }

  assert.doesNotThrow(() =>
    execFileSync(
      path.join(repositoryRoot, ".venv/bin/python"),
      ["-B", "-S", "-c", "from app.lambda_handler import handler"],
      {
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1", PYTHONPATH: bundle },
        stdio: "pipe",
      },
    ),
  )
  assert.deepEqual(
    walk(bundle).filter(
      file => file.endsWith(".pyc") || file.split(path.sep).includes("__pycache__"),
    ),
    [],
  )

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
