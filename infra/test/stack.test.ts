import assert from "node:assert/strict"
import test from "node:test"
import * as cdk from "aws-cdk-lib"
import { Match, Template } from "aws-cdk-lib/assertions"
import { RagEngineeringStack } from "../lib/rag-engineering-stack"

function template(): Template { const app=new cdk.App(); return Template.fromStack(new RagEngineeringStack(app,"TestStack")) }

test("creates the standard S3 Vectors knowledge base from the guide", () => {
  const value=template()
  value.resourceCountIs("AWS::S3Vectors::VectorBucket",1)
  value.hasResourceProperties("AWS::S3Vectors::Index",{ DataType:"float32", Dimension:1024, DistanceMetric:"cosine" })
  value.hasResourceProperties("AWS::Bedrock::KnowledgeBase",{ KnowledgeBaseConfiguration:{ Type:"VECTOR" }, StorageConfiguration:{ Type:"S3_VECTORS" } })
  value.hasResourceProperties("AWS::Bedrock::DataSource",{ DataDeletionPolicy:"RETAIN", VectorIngestionConfiguration:{ ChunkingConfiguration:{ ChunkingStrategy:"FIXED_SIZE", FixedSizeChunkingConfiguration:{ MaxTokens:300, OverlapPercentage:20 } } } })
})

test("retains encrypted private data and uses a constrained identity boundary", () => {
  const value=template()
  value.hasResourceProperties("AWS::S3::Bucket",{ BucketEncryption:Match.anyValue(), PublicAccessBlockConfiguration:{ BlockPublicAcls:true,BlockPublicPolicy:true,IgnorePublicAcls:true,RestrictPublicBuckets:true }, VersioningConfiguration:{ Status:"Enabled" } })
  value.hasResourceProperties("AWS::Cognito::UserPool",{ AdminCreateUserConfig:{ AllowAdminCreateUserOnly:true }, Policies:{ PasswordPolicy:{ MinimumLength:14 } } })
  const json=value.toJSON() as {Resources:Record<string,{DeletionPolicy?:string}>}
  const durable=Object.values(json.Resources).filter(item => item.DeletionPolicy === "Retain")
  assert.ok(durable.length >= 5)
})

