import path from "node:path"
import { readFileSync } from "node:fs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as appsync from "aws-cdk-lib/aws-appsync"
import * as bedrock from "aws-cdk-lib/aws-bedrock"
import * as budgets from "aws-cdk-lib/aws-budgets"
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"
import * as origins from "aws-cdk-lib/aws-cloudfront-origins"
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as iam from "aws-cdk-lib/aws-iam"
import * as kms from "aws-cdk-lib/aws-kms"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as logs from "aws-cdk-lib/aws-logs"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment"
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
    const webBucket = new s3.Bucket(this,"WebBucket", {
      encryption:s3.BucketEncryption.S3_MANAGED,
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
    const alertEmail = new cdk.CfnParameter(this,"AlertEmail",{
      type:"String",
      allowedPattern:"^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
      description:"Operator email for the monthly AWS budget alert"
    })
    const monthlyBudgetUsd = new cdk.CfnParameter(this,"MonthlyBudgetUsd",{
      type:"Number",
      default:50,
      minValue:1,
      description:"Monthly cost budget in USD for resources tagged System=rag-engineering"
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
    new cognito.CfnUserPoolGroup(this,"AdminGroup",{
      userPoolId:userPool.userPoolId,
      groupName:"admin",
      description:"May ingest and manage authorized knowledge documents"
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
    const apiLogGroup = new logs.LogGroup(this,"ApiLogGroup",{
      encryptionKey:key,
      retention:logs.RetentionDays.ONE_YEAR,
      removalPolicy:cdk.RemovalPolicy.RETAIN
    })
    const apiFunction = new lambda.Function(this,"ApiFunction", {
      runtime:lambda.Runtime.PYTHON_3_12,
      architecture:lambda.Architecture.X86_64,
      handler:"app.lambda_handler.handler",
      code:lambda.Code.fromAsset(path.resolve(__dirname,"../lambda-dist",bundleId)),
      memorySize:1024,
      timeout:cdk.Duration.seconds(60),
      reservedConcurrentExecutions:20,
      tracing:lambda.Tracing.ACTIVE,
      logGroup:apiLogGroup,
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
    const restApi = new apigateway.RestApi(this,"RestApi", {
      endpointConfiguration:{ types:[apigateway.EndpointType.REGIONAL] },
      deployOptions:{
        stageName:"api",
        tracingEnabled:true,
        metricsEnabled:true,
        loggingLevel:apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled:false
        ,throttlingRateLimit:50
        ,throttlingBurstLimit:100
      },
      defaultCorsPreflightOptions:{
        allowOrigins:[webOrigin.valueAsString],
        allowHeaders:["Authorization","Content-Type"],
        allowMethods:["GET","POST","OPTIONS"],
        maxAge:cdk.Duration.hours(1)
      }
    })
    const integration = new apigateway.LambdaIntegration(apiFunction,{ proxy:true })
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,"CognitoAuthorizer",{ cognitoUserPools:[userPool] }
    )
    const v1 = restApi.root.addResource("v1")
    for (const resourceName of ["documents","search","answers"]) {
      v1.addResource(resourceName).addMethod("POST",integration,{
        authorizationType:apigateway.AuthorizationType.COGNITO,
        authorizer:cognitoAuthorizer
      })
    }
    restApi.root.addResource("health").addMethod("GET",integration,{
      authorizationType:apigateway.AuthorizationType.NONE
    })

    const eventApi = new appsync.GraphqlApi(this,"EventApi", {
      name:"rag-engineering-events",
      definition:appsync.Definition.fromFile(path.resolve(__dirname,"appsync-events.graphql")),
      authorizationConfig:{
        defaultAuthorization:{
          authorizationType:appsync.AuthorizationType.USER_POOL,
          userPoolConfig:{ userPool }
        },
        additionalAuthorizationModes:[{ authorizationType:appsync.AuthorizationType.IAM }]
      },
      logConfig:{ fieldLogLevel:appsync.FieldLogLevel.ERROR, retention:logs.RetentionDays.ONE_YEAR },
      xrayEnabled:true
    })
    const eventSource = eventApi.addNoneDataSource("EventSource")
    eventSource.createResolver("PublishEventResolver",{
      typeName:"Mutation",
      fieldName:"publishEvent",
      requestMappingTemplate:appsync.MappingTemplate.fromString(
        '{"version":"2017-02-28","payload":$util.toJson($context.arguments)}'
      ),
      responseMappingTemplate:appsync.MappingTemplate.fromString("$util.toJson($context.result)")
    })
    eventSource.createResolver("HealthResolver",{
      typeName:"Query",
      fieldName:"health",
      requestMappingTemplate:appsync.MappingTemplate.fromString(
        '{"version":"2017-02-28","payload":true}'
      ),
      responseMappingTemplate:appsync.MappingTemplate.fromString("$util.toJson($context.result)")
    })
    eventSource.createResolver("SubscriptionAuthorizationResolver",{
      typeName:"Subscription",
      fieldName:"onEvent",
      requestMappingTemplate:appsync.MappingTemplate.fromString(`
        #if($context.identity.sub != $context.arguments.channel)
          $util.unauthorized()
        #end
        {"version":"2017-02-28","payload":{}}
      `),
      responseMappingTemplate:appsync.MappingTemplate.fromString("$util.toJson($context.result)")
    })
    eventApi.grantMutation(apiFunction,"publishEvent")
    apiFunction.addEnvironment("RAG_APPSYNC_GRAPHQL_URL",eventApi.graphqlUrl)

    const spaRewrite = new cloudfront.Function(this,"SpaRewrite",{
      runtime:cloudfront.FunctionRuntime.JS_2_0,
      code:cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var request = event.request;
          if (request.uri.indexOf('.') === -1) request.uri = '/index.html';
          return request;
        }
      `)
    })
    const distribution = new cloudfront.Distribution(this,"Distribution",{
      defaultRootObject:"index.html",
      minimumProtocolVersion:cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior:{
        origin:origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy:cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress:true,
        functionAssociations:[{
          function:spaRewrite,
          eventType:cloudfront.FunctionEventType.VIEWER_REQUEST
        }]
      },
      additionalBehaviors:{
        "/v1/*":{
          origin:new origins.RestApiOrigin(restApi),
          viewerProtocolPolicy:cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods:cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy:cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
        },
        "/health":{
          origin:new origins.RestApiOrigin(restApi),
          viewerProtocolPolicy:cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods:cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy:cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
        }
      }
    })
    new s3deploy.BucketDeployment(this,"WebDeployment",{
      sources:[s3deploy.Source.asset(path.resolve(__dirname,"../../frontend/web/dist"))],
      destinationBucket:webBucket,
      distribution,
      distributionPaths:["/*"],
      prune:true
    })
    const lambdaErrors = apiFunction.metricErrors({ period:cdk.Duration.minutes(5) }).createAlarm(
      this,"LambdaErrorsAlarm",{
        threshold:1,
        evaluationPeriods:1,
        treatMissingData:cloudwatch.TreatMissingData.NOT_BREACHING
      }
    )
    const lambdaThrottles = apiFunction.metricThrottles({ period:cdk.Duration.minutes(5) }).createAlarm(
      this,"LambdaThrottlesAlarm",{
        threshold:1,
        evaluationPeriods:1,
        treatMissingData:cloudwatch.TreatMissingData.NOT_BREACHING
      }
    )
    const apiErrors = restApi.metricServerError({ period:cdk.Duration.minutes(5) }).createAlarm(
      this,"ApiServerErrorsAlarm",{
        threshold:1,
        evaluationPeriods:1,
        treatMissingData:cloudwatch.TreatMissingData.NOT_BREACHING
      }
    )
    const distributionErrors = distribution.metric5xxErrorRate({ period:cdk.Duration.minutes(5) }).createAlarm(
      this,"DistributionErrorsAlarm",{
        threshold:1,
        evaluationPeriods:1,
        treatMissingData:cloudwatch.TreatMissingData.NOT_BREACHING
      }
    )
    const dashboard = new cloudwatch.Dashboard(this,"OperationsDashboard")
    dashboard.addWidgets(
      new cloudwatch.AlarmWidget({ title:"API alarms",alarm:lambdaErrors }),
      new cloudwatch.AlarmWidget({ title:"Lambda throttles",alarm:lambdaThrottles }),
      new cloudwatch.AlarmWidget({ title:"REST 5xx",alarm:apiErrors }),
      new cloudwatch.AlarmWidget({ title:"CloudFront 5xx rate",alarm:distributionErrors }),
      new cloudwatch.GraphWidget({
        title:"Lambda latency and invocations",
        left:[apiFunction.metricDuration(),apiFunction.metricInvocations()]
      })
    )
    new budgets.CfnBudget(this,"MonthlyBudget",{
      budget:{
        budgetName:"rag-engineering-monthly",
        budgetType:"COST",
        timeUnit:"MONTHLY",
        budgetLimit:{ amount:monthlyBudgetUsd.valueAsNumber,unit:"USD" },
        costFilters:{ TagKeyValue:["user:System$rag-engineering"] }
      },
      notificationsWithSubscribers:[{
        notification:{
          comparisonOperator:"GREATER_THAN",
          notificationType:"ACTUAL",
          threshold:80,
          thresholdType:"PERCENTAGE"
        },
        subscribers:[{ address:alertEmail.valueAsString,subscriptionType:"EMAIL" }]
      }]
    })
    new cdk.CfnOutput(this,"SourceBucketName", { value:source.bucketName })
    new cdk.CfnOutput(this,"KnowledgeBaseId", { value:knowledgeBase.attrKnowledgeBaseId })
    new cdk.CfnOutput(this,"ApiUrl", { value:`https://${distribution.distributionDomainName}` })
    new cdk.CfnOutput(this,"RestApiUrl", { value:restApi.url })
    new cdk.CfnOutput(this,"WebUrl", { value:`https://${distribution.distributionDomainName}` })
    new cdk.CfnOutput(this,"AppSyncGraphqlUrl", { value:eventApi.graphqlUrl })
    new cdk.CfnOutput(this,"AppSyncRealtimeUrl", { value:eventApi.graphqlUrl.replace("appsync-api","appsync-realtime-api").replace("https://","wss://") })
    new cdk.CfnOutput(this,"OperationsDashboardName", { value:dashboard.dashboardName })
    new cdk.CfnOutput(this,"CognitoUserPoolId", { value:userPool.userPoolId })
    new cdk.CfnOutput(this,"CognitoClientId", { value:userPoolClient.userPoolClientId })
    new cdk.CfnOutput(this,"CognitoHostedUiBaseUrl", { value:userPoolDomain.baseUrl() })
  }
}
