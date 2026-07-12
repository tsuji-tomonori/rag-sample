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

test("protects every product route with Cognito JWT authorization", () => {
  const json = template().toJSON() as { Resources: Record<string, { Type:string; Properties?:Record<string,unknown> }> }
  const methods = Object.values(json.Resources).filter(resource => resource.Type === "AWS::ApiGateway::Method")
  const protectedMethods = methods.filter(resource => resource.Properties?.HttpMethod === "POST")
  assert.equal(protectedMethods.length,3)
  for (const method of protectedMethods) {
    assert.equal(method.Properties?.AuthorizationType,"COGNITO_USER_POOLS")
    assert.ok(method.Properties?.AuthorizerId)
  }
  const health = methods.find(resource => resource.Properties?.HttpMethod === "GET")
  assert.ok(health)
  assert.equal(health.Properties?.AuthorizationType,"NONE")
})

test("configures the Lambda API for Cognito and AWS adapters without wildcard model access", () => {
  const value=template()
  value.hasResourceProperties("AWS::Lambda::Function",{
    Runtime:"python3.12",
    Architectures:["x86_64"],
    Environment:{ Variables:{ RAG_AUTH_MODE:"cognito",RAG_STORAGE_BACKEND:"aws" } },
    TracingConfig:{ Mode:"Active" }
  })
  const serialized=JSON.stringify(value.toJSON())
  assert.match(serialized,/anthropic\.claude-haiku-4-5-20251001-v1:0/)
  assert.doesNotMatch(serialized,/foundation-model\/\*/)
})

test("matches the architecture drawing with private SPA, routing function, REST API, and AppSync", () => {
  const value=template()
  value.resourceCountIs("AWS::CloudFront::Distribution",1)
  value.resourceCountIs("AWS::CloudFront::Function",1)
  value.resourceCountIs("AWS::ApiGateway::RestApi",1)
  value.resourceCountIs("AWS::AppSync::GraphQLApi",1)
  value.hasResourceProperties("AWS::S3::Bucket",{
    PublicAccessBlockConfiguration:{ BlockPublicAcls:true,BlockPublicPolicy:true,IgnorePublicAcls:true,RestrictPublicBuckets:true }
  })
  value.hasResourceProperties("AWS::AppSync::GraphQLApi",{
    AuthenticationType:"AMAZON_COGNITO_USER_POOLS",
    XrayEnabled:true
  })
  value.hasResourceProperties("AWS::Cognito::UserPoolGroup",{ GroupName:"admin" })
  value.hasResourceProperties("AWS::AppSync::Resolver",{ TypeName:"Subscription",FieldName:"onEvent" })
})
