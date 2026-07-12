import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import * as cdk from "aws-cdk-lib"

import { RagEngineeringStack } from "../lib/rag-engineering-stack"

const app = new cdk.App()
const stack = new RagEngineeringStack(app, "InventoryStack")
const artifact = app.synth().getStackArtifact(stack.artifactId)
const snapshot = `${JSON.stringify(artifact.template, null, 2)}\n`
const output = path.resolve(
  __dirname,
  "../test/__snapshots__/rag-engineering-stack.snapshot.json",
)

if (process.argv.includes("--check")) {
  if (!existsSync(output) || readFileSync(output, "utf8") !== snapshot) {
    throw new Error("Infra CloudFormation snapshot is stale")
  }
} else {
  mkdirSync(path.dirname(output), { recursive: true })
  writeFileSync(output, snapshot)
}
