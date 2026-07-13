import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import {
  cpSync,
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
const sourceRoot = path.join(root, "src")
const packagedSourceFiles = walk(sourceRoot).filter(isPackagedSourceFile)
const sources = [
  "pyproject.toml",
  "uv.lock",
  "infra/scripts/bundle-api.mjs",
  ...packagedSourceFiles.map(file => path.relative(root, file))
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
  const lockedRequirements = `${staging}.requirements.txt`
  const environment = {
    ...process.env,
    UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? "/tmp/uv-cache"
  }
  rmSync(staging, { recursive: true, force: true })
  rmSync(lockedRequirements, { force: true })
  try {
    execFileSync(
      "uv",
      [
        "export",
        "--quiet",
        "--locked",
        "--no-dev",
        "--no-emit-project",
        "--output-file",
        lockedRequirements
      ],
      { cwd: root, env: environment, stdio: "inherit" }
    )
    execFileSync(
      "uv",
      [
        "pip",
        "install",
        "--target",
        staging,
        "--no-deps",
        "--require-hashes",
        "--requirements",
        lockedRequirements
      ],
      { cwd: root, env: environment, stdio: "inherit" }
    )
    copyPackagedSource(staging)
    normalizeBundle(staging)
    assertPortableBundle(staging)
    writeFileSync(path.join(staging, ".bundle-complete"), `${bundleId}\n`)
    rmSync(destination, { recursive: true, force: true })
    renameSync(staging, destination)
  } finally {
    rmSync(staging, { recursive: true, force: true })
    rmSync(lockedRequirements, { force: true })
  }
}

function copyPackagedSource(directory) {
  for (const source of packagedSourceFiles) {
    const target = path.join(directory, path.relative(sourceRoot, source))
    mkdirSync(path.dirname(target), { recursive: true })
    cpSync(source, target)
  }
}

function isPackagedSourceFile(file) {
  const segments = path.relative(sourceRoot, file).split(path.sep)
  return (
    !segments.includes("__pycache__") &&
    !file.endsWith(".pyc") &&
    !file.endsWith(".pyo") &&
    path.basename(file) !== ".DS_Store"
  )
}

function normalizeBundle(directory) {
  // Installer metadata contains checkout paths, timestamps, and uv-version-specific fields.
  // Lambda imports modules directly, so these files and console scripts are not runtime inputs.
  removePythonCaches(directory)
  rmSync(path.join(directory, "bin"), { recursive: true, force: true })
  rmSync(path.join(directory, ".lock"), { force: true })
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

function removePythonCaches(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory() && entry.name === "__pycache__") {
      rmSync(target, { recursive: true, force: true })
    } else if (entry.isDirectory()) {
      removePythonCaches(target)
    } else if (target.endsWith(".pyc") || target.endsWith(".pyo")) {
      rmSync(target, { force: true })
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
