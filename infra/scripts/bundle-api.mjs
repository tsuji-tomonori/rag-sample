import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "../..")
const destinationRoot = path.resolve(import.meta.dirname, "../lambda-dist")
const sources = [
  "pyproject.toml",
  "uv.lock",
  "infra/scripts/bundle-api.mjs",
  ...walk(path.join(root, "src")).map(file => path.relative(root, file))
]
const hash = createHash("sha256")
for (const source of sources.sort()) {
  hash.update(source)
  hash.update(readFileSync(path.join(root, source)))
}
const bundleId = hash.digest("hex").slice(0, 16)
const destination = path.join(destinationRoot, bundleId)
const completionMarker = path.join(destination, ".bundle-complete")
mkdirSync(destinationRoot, { recursive: true })
if (!existsSync(completionMarker)) {
  installBundle()
}
normalizeBundle(destination)
assertPortableBundle(destination)
writeFileSync(path.join(destinationRoot, "bundle-path.txt"), `${bundleId}\n`)

function installBundle() {
  const staging = `${destination}.tmp-${process.pid}`
  rmSync(staging, { recursive: true, force: true })
  try {
    execFileSync("uv", ["pip", "install", "--target", staging, root], {
      cwd: root,
      env: { ...process.env, UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? "/tmp/uv-cache" },
      stdio: "inherit"
    })
    normalizeBundle(staging)
    assertPortableBundle(staging)
    writeFileSync(path.join(staging, ".bundle-complete"), `${bundleId}\n`)
    rmSync(destination, { recursive: true, force: true })
    renameSync(staging, destination)
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

function normalizeBundle(directory) {
  // Installer metadata contains checkout paths, timestamps, and uv-version-specific fields.
  // Lambda imports modules directly, so these files and console scripts are not runtime inputs.
  rmSync(path.join(directory, "bin"), { recursive: true, force: true })
  for (const file of walk(directory)) {
    const parent = path.basename(path.dirname(file))
    if (parent.endsWith(".dist-info") && isNonRuntimeInstallerMetadata(path.basename(file))) {
      rmSync(file)
      continue
    }
    if (parent.endsWith(".dist-info") && path.basename(file) === "RECORD") {
      const lines = readFileSync(file, "utf8")
        .split(/\r?\n/)
        .filter(line => line && !isHostDependentRecord(line))
      writeFileSync(file, `${lines.join("\n")}\n`)
    }
  }
}

function isHostDependentRecord(line) {
  const delimiter = line.indexOf(",")
  const entry = delimiter === -1 ? line : line.slice(0, delimiter)
  return (
    /^(?:\.\.\/)*bin\//.test(entry) ||
    isNonRuntimeInstallerMetadata(entry.split("/").at(-1) ?? "")
  )
}

function isNonRuntimeInstallerMetadata(name) {
  return new Set(["direct_url.json", "uv_build.json", "uv_cache.json"]).has(name)
}

function assertPortableBundle(directory) {
  const hostPath = Buffer.from(root)
  const leaks = walk(directory)
    .filter(file => readFileSync(file).includes(hostPath))
    .map(file => path.relative(directory, file))
  if (leaks.length > 0) {
    throw new Error(`Lambda bundle contains checkout path: ${leaks.join(", ")}`)
  }
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}
