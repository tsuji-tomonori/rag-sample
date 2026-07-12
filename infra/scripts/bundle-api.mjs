import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "../..")
const destinationRoot = path.resolve(import.meta.dirname, "../lambda-dist")
const sources = ["pyproject.toml", "uv.lock", ...walk(path.join(root, "src/app")).map(file => path.relative(root, file))]
const hash = createHash("sha256")
for (const source of sources.sort()) {
  hash.update(source)
  hash.update(readFileSync(path.join(root, source)))
}
const bundleId = hash.digest("hex").slice(0, 16)
const destination = path.join(destinationRoot, bundleId)
mkdirSync(destinationRoot, { recursive: true })
if (!existsSync(destination)) {
  execFileSync("uv", ["pip", "install", "--target", destination, root], {
    cwd: root,
    env: { ...process.env, UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? "/tmp/uv-cache" },
    stdio: "inherit"
  })
}
writeFileSync(path.join(destinationRoot, "bundle-path.txt"), `${bundleId}\n`)

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}
