#!/usr/bin/env node
import * as cdk from "aws-cdk-lib"
import { RagEngineeringStack } from "../lib/rag-engineering-stack"

const app = new cdk.App()
new RagEngineeringStack(app, "RagEngineeringStack", { description: "Evidence-first RAG with Bedrock Knowledge Bases and S3 Vectors" })

