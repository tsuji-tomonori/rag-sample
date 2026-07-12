import path from "node:path"
import { readFileSync } from "node:fs"
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2"
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers"
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations"
import * as bedrock from "aws-cdk-lib/aws-bedrock"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as iam from "aws-cdk-lib/aws-iam"
import * as kms from "aws-cdk-lib/aws-kms"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as logs from "aws-cdk-lib/aws-logs"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as cdk from "aws-cdk-lib"
import type { Construct } from "constructs"

export class RagEngineeringStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)
    const tags = { System:"rag-engineering", ManagedBy:"aws-cdk", Environment:"shared" }
    for (const [key,value] of Object.entries(tags)) cdk.Tags.of(this).add(key,value)

    const key = new kms.Key(this,"DataKey", { enableKeyRotation:true, removalPolicy:cdk.RemovalPolicy.RETAIN })
    const source = new s3.Bucket(this,"SourceBucket", {
      encryption:s3.BucketEncryption.KMS,
      encryptionKey:key,
      blockPublicAccess:s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL:true,
      versioned:true,
      removalPolicy:cdk.RemovalPolicy.RETAIN
    })
    new logs.LogGroup(this,"AuditLog", { encryptionKey:key, retention:logs.RetentionDays.ONE_YEAR, removalPolicy:cdk.RemovalPolicy.RETAIN })
    const userPool = new cognito.UserPool(this,"UserPool", {
      selfSignUpEnabled:false,
      signInAliases:{ email:true },
      mfa:cognito.Mfa.OPTIONAL,
      passwordPolicy:{ minLength:14, requireDigits:true, requireLowercase:true, requireUppercase:true, requireSymbols:true },
      accountRecovery:cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy:cdk.RemovalPolicy.RETAIN
    })
    const callbackUrl = new cdk.CfnParameter(this,"WebCallbackUrl", {
      type:"String",
      default:"http://localhost:5173/auth/callback",
      description:"Allowed OAuth callback URL; override for each deployed environment"
    })
    const logoutUrl = new cdk.CfnParameter(this,"WebLogoutUrl", {
      type:"String",
      default:"http://localhost:5173/",
      description:"Allowed OAuth logout URL; override for each deployed environment"
    })
    const webOrigin = new cdk.CfnParameter(this,"WebOrigin", {
      type:"String",
      default:"http://localhost:5173",
      allowedPattern:"^https?://[^/]+$",
      description:"Exact browser Origin allowed by API CORS; no trailing slash"
    })
    const domainPrefix = new cdk.CfnParameter(this,"CognitoDomainPrefix", {
      type:"String",
      allowedPattern:"^[a-z0-9-]{1,63}$",
      description:"Globally unique Cognito hosted UI domain prefix"
    })
    const userPoolClient = userPool.addClient("WebClient", {
      generateSecret:false,
      authFlows:{ userSrp:true },
      oAuth:{
        flows:{ authorizationCodeGrant:true },
        scopes:[cognito.OAuthScope.OPENID,cognito.OAuthScope.EMAIL,cognito.OAuthScope.PROFILE],
        callbackUrls:[callbackUrl.valueAsString],
        logoutUrls:[logoutUrl.valueAsString]
      },
      preventUserExistenceErrors:true
    })
    const userPoolDomain = userPool.addDomain("HostedDomain", {
      cognitoDomain:{ domainPrefix:domainPrefix.valueAsString }
    })

    const vectorBucket = new cdk.CfnResource(this,"VectorBucket", {
      type:"AWS::S3Vectors::VectorBucket",
      properties:{ EncryptionConfiguration:{ SseType:"aws:kms", KmsKeyArn:key.keyArn }, Tags:Object.entries(tags).map(([Key,Value]) => ({Key,Value})) }
    })
    const vectorIndex = new cdk.CfnResource(this,"VectorIndex", {
      type:"AWS::S3Vectors::Index",
      properties:{ DataType:"float32", Dimension:1024, DistanceMetric:"cosine", IndexName:"rag-content", VectorBucketArn:vectorBucket.ref, Tags:Object.entries(tags).map(([Key,Value]) => ({Key,Value})) }
    })
    vectorIndex.addDependency(vectorBucket)
    vectorBucket.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)
    vectorIndex.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)

    const role = new iam.Role(this,"KnowledgeBaseRole", { assumedBy:new iam.ServicePrincipal("bedrock.amazonaws.com") })
    role.addToPolicy(new iam.PolicyStatement({ actions:["bedrock:InvokeModel"], resources:[cdk.Stack.of(this).formatArn({ service:"bedrock", account:"", resource:"foundation-model", resourceName:"amazon.titan-embed-text-v2:0" })] }))
    source.grantRead(role,"source/*")
    key.grantDecrypt(role)
    role.addToPolicy(new iam.PolicyStatement({ actions:["s3vectors:GetIndex","s3vectors:QueryVectors","s3vectors:PutVectors","s3vectors:DeleteVectors","s3vectors:GetVectors"], resources:[vectorIndex.ref] }))

    const knowledgeBase = new bedrock.CfnKnowledgeBase(this,"KnowledgeBase", {
      name:"rag-engineering-kb",
      roleArn:role.roleArn,
      knowledgeBaseConfiguration:{ type:"VECTOR", vectorKnowledgeBaseConfiguration:{ embeddingModelArn:cdk.Stack.of(this).formatArn({ service:"bedrock", account:"", resource:"foundation-model", resourceName:"amazon.titan-embed-text-v2:0" }), embeddingModelConfiguration:{ bedrockEmbeddingModelConfiguration:{ dimensions:1024, embeddingDataType:"FLOAT32" } } } },
      storageConfiguration:{ type:"S3_VECTORS", s3VectorsConfiguration:{ indexArn:vectorIndex.ref, indexName:"rag-content", vectorBucketArn:vectorBucket.ref } },
      description:"Authorized evidence index for grounded answers"
    })
    knowledgeBase.addDependency(role.node.defaultChild as cdk.CfnResource)
    knowledgeBase.addDependency(vectorIndex)
    const dataSource = new bedrock.CfnDataSource(this,"DataSource", {
      knowledgeBaseId:knowledgeBase.attrKnowledgeBaseId,
      name:"authorized-source",
      dataSourceConfiguration:{ type:"S3", s3Configuration:{ bucketArn:source.bucketArn, inclusionPrefixes:["source/"] } },
      vectorIngestionConfiguration:{ chunkingConfiguration:{ chunkingStrategy:"FIXED_SIZE", fixedSizeChunkingConfiguration:{ maxTokens:300, overlapPercentage:20 } } },
      dataDeletionPolicy:"RETAIN"
    })
    const bundleId = readFileSync(path.resolve(__dirname,"../lambda-dist/bundle-path.txt"),"utf8").trim()
    const apiFunction = new lambda.Function(this,"ApiFunction", {
      runtime:lambda.Runtime.PYTHON_3_12,
      architecture:lambda.Architecture.X86_64,
      handler:"app.lambda_handler.handler",
      code:lambda.Code.fromAsset(path.resolve(__dirname,"../lambda-dist",bundleId)),
      memorySize:1024,
      timeout:cdk.Duration.seconds(60),
      tracing:lambda.Tracing.ACTIVE,
      environment:{
        RAG_ENVIRONMENT:"aws",
        RAG_AUTH_MODE:"cognito",
        RAG_STORAGE_BACKEND:"aws",
        RAG_AWS_REGION:cdk.Aws.REGION,
        RAG_SOURCE_BUCKET:source.bucketName,
        RAG_KNOWLEDGE_BASE_ID:knowledgeBase.attrKnowledgeBaseId,
        RAG_DATA_SOURCE_ID:dataSource.attrDataSourceId,
        RAG_COGNITO_USER_POOL_ID:userPool.userPoolId,
        RAG_COGNITO_CLIENT_ID:userPoolClient.userPoolClientId,
        RAG_GENERATION_MODEL_ID:"anthropic.claude-haiku-4-5-20251001-v1:0"
      }
    })
    source.grantReadWrite(apiFunction,"source/*")
    key.grantEncryptDecrypt(apiFunction)
    apiFunction.addToRolePolicy(new iam.PolicyStatement({
      actions:["bedrock:Retrieve","bedrock:StartIngestionJob"],
      resources:[knowledgeBase.attrKnowledgeBaseArn]
    }))
    apiFunction.addToRolePolicy(new iam.PolicyStatement({
      actions:["bedrock:InvokeModel"],
      resources:[cdk.Stack.of(this).formatArn({ service:"bedrock", account:"", resource:"foundation-model", resourceName:"anthropic.claude-haiku-4-5-20251001-v1:0" })]
    }))
    const httpApi = new apigatewayv2.HttpApi(this,"HttpApi", {
      createDefaultStage:true,
      corsPreflight:{
        allowHeaders:["authorization","content-type"],
        allowMethods:[apigatewayv2.CorsHttpMethod.GET,apigatewayv2.CorsHttpMethod.POST,apigatewayv2.CorsHttpMethod.OPTIONS],
        allowOrigins:[webOrigin.valueAsString],
        maxAge:cdk.Duration.hours(1)
      }
    })
    const integration = new integrations.HttpLambdaIntegration("ApiIntegration",apiFunction)
    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer(
      "CognitoAuthorizer",
      `https://cognito-idp.${cdk.Aws.REGION}.amazonaws.com/${userPool.userPoolId}`,
      { jwtAudience:[userPoolClient.userPoolClientId] }
    )
    for (const pathPattern of ["/v1/documents","/v1/search","/v1/answers"]) {
      httpApi.addRoutes({
        path:pathPattern,
        methods:[apigatewayv2.HttpMethod.POST],
        integration,
        authorizer:jwtAuthorizer
      })
    }
    httpApi.addRoutes({ path:"/health", methods:[apigatewayv2.HttpMethod.GET], integration })
    new cdk.CfnOutput(this,"SourceBucketName", { value:source.bucketName })
    new cdk.CfnOutput(this,"KnowledgeBaseId", { value:knowledgeBase.attrKnowledgeBaseId })
    new cdk.CfnOutput(this,"ApiUrl", { value:httpApi.apiEndpoint })
    new cdk.CfnOutput(this,"CognitoUserPoolId", { value:userPool.userPoolId })
    new cdk.CfnOutput(this,"CognitoClientId", { value:userPoolClient.userPoolClientId })
    new cdk.CfnOutput(this,"CognitoHostedUiBaseUrl", { value:userPoolDomain.baseUrl() })
  }
}
