#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const snapshotPath = path.join(
  repoRoot,
  "infra/test/__snapshots__/rag-engineering-stack.snapshot.json"
)
const outputDir = path.join(repoRoot, "docs/generated")
const detailOutputDir = path.join(outputDir, "infra-inventory")
const markdownOutputPath = path.join(outputDir, "infra-inventory.md")
const jsonOutputPath = path.join(outputDir, "infra-resource-inventory.json")
const args = new Set(process.argv.slice(2))
const checkOnly = args.has("--check")

const securitySensitivePattern = /(secret|password|token|credential|privatekey|apikey)/i

const typeLabels = {
  "AWS::ApiGateway::Account": "API Gateway account settings",
  "AWS::ApiGateway::Authorizer": "API Gateway Cognito authorizer",
  "AWS::ApiGateway::Deployment": "API Gateway deployment",
  "AWS::ApiGateway::GatewayResponse": "API Gateway error response",
  "AWS::ApiGateway::Method": "API Gateway method",
  "AWS::ApiGateway::RequestValidator": "API Gateway request validator",
  "AWS::ApiGateway::Resource": "API Gateway resource path",
  "AWS::ApiGateway::RestApi": "API Gateway REST API",
  "AWS::ApiGateway::Stage": "API Gateway stage",
  "AWS::AppSync::DataSource": "AppSync data source",
  "AWS::AppSync::GraphQLApi": "AppSync GraphQL API",
  "AWS::AppSync::GraphQLSchema": "AppSync GraphQL schema",
  "AWS::AppSync::Resolver": "AppSync resolver",
  "AWS::Bedrock::DataSource": "Bedrock knowledge base data source",
  "AWS::Bedrock::KnowledgeBase": "Bedrock knowledge base",
  "AWS::Budgets::Budget": "AWS monthly budget",
  "AWS::CloudFormation::CustomResource": "CloudFormation custom resource",
  "AWS::CloudFront::Distribution": "CloudFront distribution",
  "AWS::CloudFront::OriginAccessControl": "CloudFront origin access control",
  "AWS::CloudFront::Function": "CloudFront routing function",
  "AWS::CloudWatch::Alarm": "CloudWatch alarm",
  "AWS::CloudWatch::Dashboard": "CloudWatch dashboard",
  "AWS::CodeBuild::Project": "CodeBuild benchmark runner",
  "AWS::Cognito::UserPool": "Cognito user pool",
  "AWS::Cognito::UserPoolClient": "Cognito app client",
  "AWS::Cognito::UserPoolDomain": "Cognito hosted domain",
  "AWS::Cognito::UserPoolGroup": "Cognito role group",
  "AWS::DynamoDB::Table": "DynamoDB table",
  "AWS::IAM::ManagedPolicy": "IAM managed policy",
  "AWS::IAM::Policy": "IAM inline policy",
  "AWS::IAM::Role": "IAM role",
  "AWS::KMS::Key": "KMS key",
  "AWS::Lambda::Function": "Lambda function",
  "AWS::Lambda::LayerVersion": "Lambda layer",
  "AWS::Lambda::Permission": "Lambda invoke permission",
  "AWS::Logs::LogGroup": "CloudWatch Logs log group",
  "AWS::S3::Bucket": "S3 bucket",
  "AWS::S3::BucketPolicy": "S3 bucket policy",
  "AWS::S3Vectors::Index": "S3 Vectors index",
  "AWS::S3Vectors::VectorBucket": "S3 Vectors bucket",
  "AWS::SecretsManager::Secret": "Secrets Manager secret",
  "AWS::StepFunctions::StateMachine": "Step Functions state machine",
  "Custom::CDKBucketDeployment": "CDK bucket deployment",
  "Custom::S3AutoDeleteObjects": "S3 auto delete custom resource",
  "Custom::LogRetention": "CloudWatch log retention custom resource"
}

const sectionOrder = [
  "AWS::S3::Bucket",
  "AWS::S3Vectors::VectorBucket",
  "AWS::S3Vectors::Index",
  "AWS::DynamoDB::Table",
  "AWS::Lambda::Function",
  "AWS::ApiGateway::RestApi",
  "AWS::ApiGateway::Stage",
  "AWS::ApiGateway::Resource",
  "AWS::ApiGateway::Method",
  "AWS::AppSync::GraphQLApi",
  "AWS::AppSync::GraphQLSchema",
  "AWS::AppSync::DataSource",
  "AWS::AppSync::Resolver",
  "AWS::Bedrock::KnowledgeBase",
  "AWS::Bedrock::DataSource",
  "AWS::Cognito::UserPool",
  "AWS::Cognito::UserPoolClient",
  "AWS::Cognito::UserPoolDomain",
  "AWS::Cognito::UserPoolGroup",
  "AWS::CloudFront::Distribution",
  "AWS::CloudFront::OriginAccessControl",
  "AWS::CloudFront::Function",
  "AWS::CodeBuild::Project",
  "AWS::StepFunctions::StateMachine",
  "AWS::KMS::Key",
  "AWS::SecretsManager::Secret",
  "AWS::Logs::LogGroup",
  "AWS::CloudWatch::Alarm",
  "AWS::CloudWatch::Dashboard",
  "AWS::IAM::Role",
  "AWS::IAM::Policy",
  "AWS::IAM::ManagedPolicy",
  "AWS::CloudFormation::CustomResource",
  "Custom::CDKBucketDeployment",
  "Custom::S3AutoDeleteObjects",
  "AWS::S3::BucketPolicy",
  "AWS::Lambda::LayerVersion",
  "AWS::Lambda::Permission",
  "AWS::ApiGateway::Account",
  "AWS::ApiGateway::Deployment",
  "AWS::ApiGateway::GatewayResponse",
  "AWS::ApiGateway::RequestValidator",
  "AWS::ApiGateway::Authorizer",
  "AWS::Budgets::Budget",
  "Custom::LogRetention"
]

function main() {
  const template = JSON.parse(fs.readFileSync(snapshotPath, "utf8"))
  const resources = template.Resources ?? {}
  const inventory = buildInventory(resources)
  const markdownOutputs = renderMarkdownOutputs(inventory)
  const json = `${JSON.stringify(inventory, null, 2)}\n`

  if (checkOnly) {
    const mismatches = []
    for (const [filePath, content] of markdownOutputs) {
      if (readIfExists(filePath) !== content) mismatches.push(path.relative(repoRoot, filePath))
    }
    if (readIfExists(jsonOutputPath) !== json) mismatches.push(path.relative(repoRoot, jsonOutputPath))
    const expectedMarkdownFiles = new Set(markdownOutputs.keys())
    for (const existingFile of listMarkdownFiles(detailOutputDir)) {
      if (!expectedMarkdownFiles.has(existingFile)) mismatches.push(path.relative(repoRoot, existingFile))
    }
    if (mismatches.length > 0) {
      console.error("Infra inventory docs are out of date:")
      for (const file of mismatches) console.error(`- ${file}`)
      console.error("更新するには `npm run docs:infra-inventory` を実行してください。")
      process.exit(1)
    }
    console.log("Infra inventory docs are up to date.")
    return
  }

  fs.mkdirSync(outputDir, { recursive: true })
  fs.mkdirSync(detailOutputDir, { recursive: true })
  for (const [filePath, content] of markdownOutputs) {
    fs.writeFileSync(filePath, content)
  }
  fs.writeFileSync(jsonOutputPath, json)
  console.log(`Wrote ${path.relative(repoRoot, markdownOutputPath)}`)
  console.log(`Wrote ${path.relative(repoRoot, detailOutputDir)}`)
  console.log(`Wrote ${path.relative(repoRoot, jsonOutputPath)}`)
}

function buildInventory(resources) {
  const resourceEntries = Object.entries(resources)
    .map(([logicalId, resource]) => ({
      logicalId,
      logicalName: inferLogicalName(logicalId),
      type: resource.Type,
      purpose: inferPurpose(logicalId, resource.Type),
      settings: summarizeResource(logicalId, resource, resources)
    }))
    .sort((a, b) => compareTypeThenId(a, b))

  const countsByType = Object.entries(
    resourceEntries.reduce((counts, resource) => {
      counts[resource.type] = (counts[resource.type] ?? 0) + 1
      return counts
    }, {})
  )
    .map(([type, count]) => ({ type, count, purpose: typeLabels[type] ?? "CloudFormation resource" }))
    .sort((a, b) => compareType(a.type, b.type))

  const totalsByDomain = [
    { domain: "Storage", count: countTypes(countsByType, ["AWS::S3::Bucket", "AWS::S3::BucketPolicy", "AWS::S3Vectors::VectorBucket", "AWS::S3Vectors::Index", "Custom::S3AutoDeleteObjects"]) },
    { domain: "Data", count: countTypes(countsByType, ["AWS::DynamoDB::Table"]) },
    { domain: "Compute", count: countTypes(countsByType, ["AWS::Lambda::Function", "AWS::Lambda::LayerVersion"]) },
    { domain: "API", count: countTypes(countsByType, [
      "AWS::ApiGateway::RestApi",
      "AWS::ApiGateway::Resource",
      "AWS::ApiGateway::Method",
      "AWS::ApiGateway::Stage",
      "AWS::ApiGateway::Deployment",
      "AWS::ApiGateway::Account",
      "AWS::ApiGateway::GatewayResponse",
      "AWS::ApiGateway::RequestValidator",
      "AWS::ApiGateway::Authorizer",
      "AWS::AppSync::GraphQLApi",
      "AWS::AppSync::GraphQLSchema",
      "AWS::AppSync::DataSource",
      "AWS::AppSync::Resolver"
    ]) },
    { domain: "Identity", count: countTypes(countsByType, [
      "AWS::Cognito::UserPool",
      "AWS::Cognito::UserPoolClient",
      "AWS::Cognito::UserPoolDomain",
      "AWS::Cognito::UserPoolGroup"
    ]) },
    { domain: "Delivery", count: countTypes(countsByType, ["AWS::CloudFront::Distribution", "AWS::CloudFront::OriginAccessControl", "AWS::CloudFront::Function"]) },
    { domain: "AI/RAG", count: countTypes(countsByType, ["AWS::Bedrock::KnowledgeBase", "AWS::Bedrock::DataSource"]) },
    { domain: "Workflow", count: countTypes(countsByType, ["AWS::StepFunctions::StateMachine", "AWS::CodeBuild::Project"]) },
    { domain: "Security/IAM", count: countTypes(countsByType, [
      "AWS::IAM::Role",
      "AWS::IAM::Policy",
      "AWS::IAM::ManagedPolicy",
      "AWS::KMS::Key",
      "AWS::SecretsManager::Secret"
    ]) },
    { domain: "Observability/Cost", count: countTypes(countsByType, ["AWS::Logs::LogGroup", "AWS::CloudWatch::Alarm", "AWS::CloudWatch::Dashboard", "AWS::Budgets::Budget"]) },
    { domain: "Custom", count: countTypes(countsByType, ["AWS::CloudFormation::CustomResource", "Custom::CDKBucketDeployment", "Custom::LogRetention"]) }
  ].filter((item) => item.count > 0)

  return {
    generatedBy: "tools/infra-inventory/generate-infra-inventory.mjs",
    source: "infra/test/__snapshots__/rag-engineering-stack.snapshot.json",
    stackName: "InventoryStack",
    totalResources: resourceEntries.length,
    totalsByDomain,
    countsByType,
    resources: resourceEntries.map((resource) => ({
      ...resource,
      detailFilePath: `infra-inventory/${resourceTypeFileName(resource.type)}`
    }))
  }
}

function countTypes(countsByType, types) {
  const countMap = new Map(countsByType.map((entry) => [entry.type, entry.count]))
  return types.reduce((sum, type) => sum + (countMap.get(type) ?? 0), 0)
}

function summarizeResource(logicalId, resource, resources) {
  const props = resource.Properties ?? {}
  switch (resource.Type) {
    case "AWS::S3::Bucket":
      return s3BucketSettings(props)
    case "AWS::DynamoDB::Table":
      return dynamodbSettings(props)
    case "AWS::Lambda::Function":
      return lambdaSettings(props)
    case "AWS::Logs::LogGroup":
      return compactObject({
        retentionInDays: props.RetentionInDays,
        logGroupName: summarizeValue(props.LogGroupName)
      })
    case "AWS::ApiGateway::RestApi":
      return compactObject({
        name: props.Name,
        endpointTypes: props.EndpointConfiguration?.Types,
        binaryMediaTypes: props.BinaryMediaTypes,
        minCompressionSize: props.MinimumCompressionSize
      })
    case "AWS::ApiGateway::Stage":
      return compactObject({
        stageName: props.StageName,
        loggingLevel: props.MethodSettings?.[0]?.LoggingLevel,
        metricsEnabled: props.MethodSettings?.[0]?.MetricsEnabled,
        dataTraceEnabled: props.MethodSettings?.[0]?.DataTraceEnabled,
        accessLogDestination: summarizeValue(props.AccessLogSetting?.DestinationArn)
      })
    case "AWS::ApiGateway::Resource":
      return compactObject({
        path: resourcePathByLogicalId(resources, logicalId),
        pathPart: props.PathPart
      })
    case "AWS::ApiGateway::Method":
      return apiMethodSettings(props, resources)
    case "AWS::ApiGateway::GatewayResponse":
      return compactObject({
        responseType: props.ResponseType,
        responseHeaders: props.ResponseParameters
      })
    case "AWS::ApiGateway::RequestValidator":
      return compactObject({
        name: props.Name,
        validateRequestBody: props.ValidateRequestBody,
        validateRequestParameters: props.ValidateRequestParameters
      })
    case "AWS::ApiGateway::Authorizer":
      return compactObject({
        name: props.Name,
        type: props.Type,
        providerARNs: summarizeArray(props.ProviderARNs)
      })
    case "AWS::Cognito::UserPool":
      return cognitoUserPoolSettings(props)
    case "AWS::Cognito::UserPoolClient":
      return compactObject({
        generateSecret: props.GenerateSecret,
        explicitAuthFlows: props.ExplicitAuthFlows,
        preventUserExistenceErrors: props.PreventUserExistenceErrors,
        accessTokenValidity: props.AccessTokenValidity,
        idTokenValidity: props.IdTokenValidity,
        refreshTokenValidity: props.RefreshTokenValidity
      })
    case "AWS::Cognito::UserPoolDomain":
      return compactObject({
        domain: summarizeValue(props.Domain),
        userPoolId: summarizeValue(props.UserPoolId)
      })
    case "AWS::Cognito::UserPoolGroup":
      return compactObject({
        groupName: props.GroupName,
        description: props.Description
      })
    case "AWS::CloudFront::Distribution":
      return cloudFrontSettings(props.DistributionConfig ?? {})
    case "AWS::CloudFront::OriginAccessControl":
      return compactObject({
        name: props.OriginAccessControlConfig?.Name,
        originType: props.OriginAccessControlConfig?.OriginAccessControlOriginType,
        signingBehavior: props.OriginAccessControlConfig?.SigningBehavior,
        signingProtocol: props.OriginAccessControlConfig?.SigningProtocol
      })
    case "AWS::CodeBuild::Project":
      return codeBuildSettings(props)
    case "AWS::StepFunctions::StateMachine":
      return compactObject({
        stateMachineType: props.StateMachineType ?? "STANDARD",
        loggingLevel: props.LoggingConfiguration?.Level,
        tracingConfiguration: props.TracingConfiguration,
        definitionSummary: summarizeStateMachineDefinition(props.DefinitionString)
      })
    case "AWS::KMS::Key":
      return compactObject({
        enableKeyRotation: props.EnableKeyRotation,
        keyPolicyStatementCount: asArray(props.KeyPolicy?.Statement).length
      })
    case "AWS::SecretsManager::Secret":
      return compactObject({
        description: props.Description,
        generateStringKey: props.GenerateSecretString?.GenerateStringKey ? "<masked>" : undefined,
        passwordLength: props.GenerateSecretString?.PasswordLength,
        excludedCharactersConfigured: Boolean(props.GenerateSecretString?.ExcludeCharacters)
      })
    case "AWS::IAM::Role":
      return iamRoleSettings(props)
    case "AWS::IAM::Policy":
    case "AWS::IAM::ManagedPolicy":
      return iamPolicySettings(props)
    case "AWS::CloudFormation::CustomResource":
      return sanitizeObject({
        serviceToken: summarizeValue(props.ServiceToken),
        ...Object.fromEntries(Object.entries(props).filter(([key]) => key !== "ServiceToken"))
      })
    case "Custom::CDKBucketDeployment":
      return compactObject({
        destinationBucketName: summarizeValue(props.DestinationBucketName),
        destinationBucketKeyPrefix: props.DestinationBucketKeyPrefix,
        sourceObjectKeys: summarizeArray(props.SourceObjectKeys),
        prune: props.Prune
      })
    case "Custom::S3AutoDeleteObjects":
      return compactObject({
        bucketName: summarizeValue(props.BucketName),
        serviceToken: summarizeValue(props.ServiceToken)
      })
    case "AWS::S3::BucketPolicy":
      return compactObject({
        bucket: summarizeValue(props.Bucket),
        statementCount: asArray(props.PolicyDocument?.Statement).length,
        actions: summarizeActions(props.PolicyDocument)
      })
    case "AWS::Lambda::LayerVersion":
      return compactObject({
        compatibleRuntimes: props.CompatibleRuntimes,
        content: summarizeValue(props.Content)
      })
    case "AWS::Lambda::Permission":
      return compactObject({
        action: props.Action,
        principal: props.Principal,
        functionName: summarizeValue(props.FunctionName),
        sourceArn: summarizeValue(props.SourceArn)
      })
    case "AWS::ApiGateway::Deployment":
      return compactObject({
        restApiId: summarizeValue(props.RestApiId),
        description: props.Description
      })
    case "AWS::ApiGateway::Account":
      return compactObject({
        cloudWatchRoleArn: summarizeValue(props.CloudWatchRoleArn)
      })
    default:
      return sanitizeObject(props)
  }
}

function s3BucketSettings(props) {
  return compactObject({
    encryption: props.BucketEncryption?.ServerSideEncryptionConfiguration?.map((config) => config.ServerSideEncryptionByDefault?.SSEAlgorithm),
    publicAccessBlock: props.PublicAccessBlockConfiguration,
    enforceSSLPolicy: "BucketPolicy を参照",
    objectOwnership: props.OwnershipControls?.Rules?.map((rule) => rule.ObjectOwnership),
    loggingPrefix: props.LoggingConfiguration?.LogFilePrefix,
    lifecycleRules: (props.LifecycleConfiguration?.Rules ?? []).map((rule) => compactObject({
      prefix: rule.Prefix,
      expirationInDays: rule.ExpirationInDays,
      status: rule.Status
    })),
    corsRules: (props.CorsConfiguration?.CorsRules ?? []).map((rule) => compactObject({
      allowedMethods: rule.AllowedMethods,
      allowedOrigins: rule.AllowedOrigins,
      allowedHeaders: rule.AllowedHeaders,
      exposedHeaders: rule.ExposedHeaders,
      maxAge: rule.MaxAge
    }))
  })
}

function dynamodbSettings(props) {
  return compactObject({
    keySchema: props.KeySchema,
    attributeDefinitions: props.AttributeDefinitions,
    billingMode: props.BillingMode,
    pointInTimeRecoveryEnabled: props.PointInTimeRecoverySpecification?.PointInTimeRecoveryEnabled,
    timeToLive: props.TimeToLiveSpecification
  })
}

function lambdaSettings(props) {
  return compactObject({
    handler: props.Handler,
    runtime: props.Runtime,
    architectures: props.Architectures,
    memorySize: props.MemorySize,
    timeoutSeconds: props.Timeout,
    ephemeralStorageMb: props.EphemeralStorage?.Size,
    environment: sanitizeEnvironment(props.Environment?.Variables ?? {}),
    layers: summarizeArray(props.Layers),
    role: summarizeValue(props.Role)
  })
}

function apiMethodSettings(props, resources) {
  return compactObject({
    method: props.HttpMethod,
    path: typeof props.ResourceId?.Ref === "string" ? resourcePathByLogicalId(resources, props.ResourceId.Ref) : "/",
    authorizationType: props.AuthorizationType,
    authorizerId: summarizeValue(props.AuthorizerId),
    requestValidatorId: summarizeValue(props.RequestValidatorId),
    integrationType: props.Integration?.Type,
    integrationHttpMethod: props.Integration?.IntegrationHttpMethod,
    integrationTimeoutMs: props.Integration?.TimeoutInMillis,
    responseTransferMode: props.Integration?.ResponseTransferMode
  })
}

function cognitoUserPoolSettings(props) {
  return compactObject({
    adminCreateUserOnly: props.AdminCreateUserConfig?.AllowAdminCreateUserOnly,
    usernameAttributes: props.UsernameAttributes,
    autoVerifiedAttributes: props.AutoVerifiedAttributes,
    mfaConfiguration: props.MfaConfiguration,
    enabledMfas: props.EnabledMfas,
    accountRecoveryMechanisms: props.AccountRecoverySetting?.RecoveryMechanisms,
    passwordPolicy: props.Policies?.PasswordPolicy
  })
}

function cloudFrontSettings(config) {
  return compactObject({
    enabled: config.Enabled,
    defaultRootObject: config.DefaultRootObject,
    httpVersion: config.HttpVersion,
    priceClass: config.PriceClass,
    defaultViewerProtocolPolicy: config.DefaultCacheBehavior?.ViewerProtocolPolicy,
    allowedMethods: config.DefaultCacheBehavior?.AllowedMethods,
    cachedMethods: config.DefaultCacheBehavior?.CachedMethods,
    origins: (config.Origins ?? []).map((origin) => compactObject({
      id: origin.Id,
      domainName: summarizeValue(origin.DomainName),
      originAccessControlId: summarizeValue(origin.OriginAccessControlId)
    })),
    logging: config.Logging,
    customErrorResponses: config.CustomErrorResponses
  })
}

function codeBuildSettings(props) {
  return compactObject({
    serviceRole: summarizeValue(props.ServiceRole),
    encryptionKey: summarizeValue(props.EncryptionKey),
    timeoutInMinutes: props.TimeoutInMinutes,
    queuedTimeoutInMinutes: props.QueuedTimeoutInMinutes,
    computeType: props.Environment?.ComputeType,
    image: props.Environment?.Image,
    privilegedMode: props.Environment?.PrivilegedMode,
    environmentVariables: (props.Environment?.EnvironmentVariables ?? []).map((item) => ({
      name: item.Name,
      value: securitySensitivePattern.test(item.Name) ? "<masked-or-reference>" : summarizeValue(item.Value),
      type: item.Type
    })),
    sourceType: props.Source?.Type,
    sourceLocation: props.Source?.Location,
    sourceVersion: props.SourceVersion,
    logsConfig: props.LogsConfig
  })
}

function iamRoleSettings(props) {
  return compactObject({
    assumedBy: summarizePrincipals(props.AssumeRolePolicyDocument),
    managedPolicyArns: summarizeArray(props.ManagedPolicyArns),
    inlinePolicyCount: asArray(props.Policies).length
  })
}

function iamPolicySettings(props) {
  const document = props.PolicyDocument ?? {}
  return compactObject({
    policyName: props.PolicyName,
    roles: summarizeArray(props.Roles),
    statementCount: asArray(document.Statement).length,
    actions: summarizeActions(document),
    resources: summarizeResources(document)
  })
}

function summarizePrincipals(policyDocument) {
  return unique(asArray(policyDocument?.Statement).flatMap((statement) => {
    const principal = statement.Principal ?? {}
    return Object.entries(principal).flatMap(([key, value]) => asArray(value).map((item) => `${key}:${summarizeValue(item)}`))
  }))
}

function summarizeActions(policyDocument) {
  return unique(asArray(policyDocument?.Statement).flatMap((statement) => asArray(statement.Action).map(String))).sort()
}

function summarizeResources(policyDocument) {
  return unique(asArray(policyDocument?.Statement).flatMap((statement) => asArray(statement.Resource).map(summarizeValue))).sort()
}

function summarizeStateMachineDefinition(definition) {
  const rendered = JSON.stringify(definition)
  const names = []
  for (const pattern of ["BenchmarkStartCodeBuild", "ChatRunWorkerTask", "ChatRunMarkFailedTask", "DocumentIngestRunWorkerTask", "DocumentIngestRunMarkFailedTask"]) {
    if (rendered.includes(pattern)) names.push(pattern)
  }
  return names.length > 0 ? names : truncate(rendered, 160)
}

function sanitizeEnvironment(env) {
  return Object.fromEntries(Object.entries(env)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => [
      key,
      securitySensitivePattern.test(key) ? "<masked-or-reference>" : summarizeValue(value)
    ]))
}

function sanitizeObject(value) {
  if (Array.isArray(value)) return value.map(sanitizeObject)
  if (!value || typeof value !== "object") return value
  return compactObject(Object.fromEntries(Object.entries(value).map(([key, nested]) => [
    key,
    securitySensitivePattern.test(key) ? "<masked-or-reference>" : sanitizeObject(nested)
  ])))
}

function summarizeArray(value) {
  return asArray(value).map(summarizeValue)
}

function summarizeValue(value) {
  if (value === undefined || value === null) return value
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value
  if (Array.isArray(value)) return value.map(summarizeValue)
  if (typeof value === "object") {
    if (typeof value.Ref === "string") return `Ref:${value.Ref}`
    if (typeof value["Fn::GetAtt"] !== "undefined") return `GetAtt:${asArray(value["Fn::GetAtt"]).join(".")}`
    if (typeof value["Fn::Sub"] !== "undefined") return `Sub:${truncate(String(value["Fn::Sub"]), 140)}`
    if (typeof value["Fn::Join"] !== "undefined") return `Join:${truncate(JSON.stringify(value["Fn::Join"]), 140)}`
    return truncate(JSON.stringify(sanitizeObject(value)), 180)
  }
  return String(value)
}

function resourcePathByLogicalId(resources, logicalId) {
  const resource = resources[logicalId]
  if (!resource) return "unknown"
  if (resource.Type !== "AWS::ApiGateway::Resource") return "/"
  const parentId = resource.Properties?.ParentId?.Ref
  const parentPath = typeof parentId === "string" ? resourcePathByLogicalId(resources, parentId) : ""
  return `${parentPath}/${resource.Properties?.PathPart ?? ""}`.replace(/\/+/g, "/")
}

function renderMarkdownOutputs(inventory) {
  const outputs = new Map()
  outputs.set(markdownOutputPath, renderIndexMarkdown(inventory))

  const resourcesByType = groupBy(inventory.resources, (resource) => resource.type)
  for (const type of [...resourcesByType.keys()].sort(compareType)) {
    const filePath = path.join(detailOutputDir, resourceTypeFileName(type))
    outputs.set(filePath, renderTypeDetailMarkdown(inventory, type, resourcesByType.get(type) ?? []))
  }

  return outputs
}

function renderIndexMarkdown(inventory) {
  const lines = [
    "# AWS リソースインベントリ",
    "",
    "<!-- This file is generated by npm run docs:infra-inventory. Do not edit manually. -->",
    "",
    `> 自動生成: \`${inventory.generatedBy}\``,
    ">",
    `> 入力: \`${inventory.source}\``,
    ">",
    "> CloudFormation template の静的解析です。deploy 後に AWS 側で自動作成される補助リソースや実行時に作成されるデータは含みません。",
    "",
    "## 全体サマリ",
    "",
    `- 対象スタック: \`${inventory.stackName}\``,
    `- CloudFormation resources: ${inventory.totalResources}`,
    "",
    "| 領域 | 件数 |",
    "| --- | ---: |",
    ...inventory.totalsByDomain.map((item) => `| ${escapeMd(item.domain)} | ${item.count} |`),
    "",
    "## CloudFormation Type 別リソース数",
    "",
    "| Resource type | 個数 | 用途概要 | 詳細 |",
    "| --- | ---: | --- | --- |",
    ...inventory.countsByType.map((item) => {
      const detailFilePath = `infra-inventory/${resourceTypeFileName(item.type)}`
      return `| \`${item.type}\` | ${item.count} | ${escapeMd(item.purpose)} | [詳細](${detailFilePath}) |`
    }),
    "",
    "## リソース別主要設定",
    "",
    "リソース別主要設定は、CloudFormation resource type ごとに分割した詳細ファイルに記載しています。",
    "",
    "| Resource type | 詳細ファイル |",
    "| --- | --- |",
    ...inventory.countsByType.map((item) => `| \`${item.type}\` | [${resourceTypeFileName(item.type)}](infra-inventory/${resourceTypeFileName(item.type)}) |`),
    "",
    "## 注意事項",
    "",
    "- `Secret`、`Password`、`Token`、`Credential` などを含む値は生成時に masked 表記へ寄せています。",
    "- IAM policy は action と resource の要約です。condition や intrinsic function の完全な評価は CloudFormation template を確認してください。",
    "- 実リソース数の根拠は CDK snapshot です。CDK 実装を変えた場合は infra test / snapshot 更新と合わせて再生成してください。"
  ]

  return `${lines.join("\n")}\n`
}

function renderTypeDetailMarkdown(inventory, type, resources) {
  const resourceByLogicalId = new Map(inventory.resources.map((resource) => [resource.logicalId, resource]))
  const lines = [
    `# ${type}`,
    "",
    "<!-- This file is generated by npm run docs:infra-inventory. Do not edit manually. -->",
    "",
    "[AWS リソースインベントリへ戻る](../infra-inventory.md)",
    "",
    `> 自動生成: \`${inventory.generatedBy}\``,
    ">",
    `> 入力: \`${inventory.source}\``,
    "",
    `用途概要: ${typeLabels[type] ?? "CloudFormation resource"}`,
    "",
    `リソース数: ${resources.length}`,
    "",
    "## Logical ID 一覧",
    "",
    "| 論理ID | Logical ID | 用途推定 |",
    "| --- | --- | --- |",
    ...resources.map((resource) => `| [${escapeMd(resource.logicalName)}](#${anchorFor(resource.logicalName)}) | \`${resource.logicalId}\` | ${escapeMd(resource.purpose)} |`),
    "",
    "## Logical ID 別設定",
    ""
  ]

  for (const resource of resources) {
    lines.push(`### ${resource.logicalName}`)
    lines.push("")
    lines.push(`Logical ID: \`${resource.logicalId}\``)
    lines.push("")
    lines.push(`用途推定: ${escapeMd(resource.purpose)}`)
    lines.push("")
    lines.push("| 設定項目 | 値 |")
    lines.push("| --- | --- |")
    for (const [key, value] of settingsEntries(resource.settings, { omitEnvironment: type === "AWS::Lambda::Function" })) {
      lines.push(`| \`${escapeMd(key)}\` | ${formatSettingValue(key, value, resourceByLogicalId)} |`)
    }
    if (type === "AWS::Lambda::Function" && resource.settings.environment) {
      lines.push("")
      lines.push("#### Environment variables")
      lines.push("")
      lines.push("| Key | Value |")
      lines.push("| --- | --- |")
      for (const [key, value] of Object.entries(resource.settings.environment)) {
        lines.push(`| \`${escapeMd(key)}\` | ${formatSettingValue(key, value, resourceByLogicalId)} |`)
      }
    }
    if (resource !== resources.at(-1)) lines.push("")
  }

  return `${lines.join("\n")}\n`
}

function formatValue(value) {
  if (value === undefined || value === null) return "-"
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]"
    if (value.every((item) => typeof item !== "object" || item === null)) return `[${value.map(formatValue).join(", ")}]`
    return JSON.stringify(value)
  }
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function formatSettingValue(key, value, resourceByLogicalId) {
  if (key === "role") {
    const linkedRole = formatRoleLink(value, resourceByLogicalId)
    if (linkedRole) return linkedRole
  }
  return escapeMd(formatValue(value))
}

function settingsEntries(settings, options = {}) {
  const entries = Object.entries(settings ?? {})
    .filter(([key]) => !(options.omitEnvironment && key === "environment"))
  return entries.length > 0 ? entries : [["-", "-"]]
}

function formatRoleLink(value, resourceByLogicalId) {
  const roleLogicalId = parseGetAttLogicalId(value)
  if (!roleLogicalId) return null
  const roleResource = resourceByLogicalId.get(roleLogicalId)
  if (!roleResource || roleResource.type !== "AWS::IAM::Role") return escapeMd(formatValue(value))
  return `[${escapeMd(roleResource.logicalName)}](aws-iam-role.md#${anchorFor(roleResource.logicalName)}) (\`${roleResource.logicalId}\`)`
}

function parseGetAttLogicalId(value) {
  if (typeof value !== "string") return null
  const match = /^GetAtt:([^.]+)\.Arn$/.exec(value)
  return match?.[1] ?? null
}

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => {
    if (value === undefined || value === null) return false
    if (Array.isArray(value) && value.length === 0) return false
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return false
    return true
  }))
}

function inferPurpose(logicalId, type) {
  const base = inferLogicalName(logicalId)
  return `${base || logicalId} (${typeLabels[type] ?? type})`
}

function inferLogicalName(logicalId) {
  return logicalId
    .replace(/(?<![A-F0-9])[A-F0-9]{8}$/g, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
}

function compareTypeThenId(a, b) {
  const byType = compareType(a.type, b.type)
  if (byType !== 0) return byType
  return a.logicalId.localeCompare(b.logicalId)
}

function compareType(a, b) {
  const aIndex = sectionOrder.indexOf(a)
  const bIndex = sectionOrder.indexOf(b)
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  }
  return a.localeCompare(b)
}

function groupBy(values, keyFn) {
  const groups = new Map()
  for (const value of values) {
    const key = keyFn(value)
    groups.set(key, [...(groups.get(key) ?? []), value])
  }
  return groups
}

function resourceTypeFileName(type) {
  return `${type.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.md`
}

function anchorFor(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9 _-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return listMarkdownFiles(fullPath)
    if (entry.isFile() && entry.name.endsWith(".md")) return [fullPath]
    return []
  })
}

function asArray(value) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null))]
}

function truncate(value, length) {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`
}

function escapeMd(value) {
  return String(value)
    .replaceAll("|", "\\|")
    .replaceAll("\n", "<br>")
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null
}

main()
