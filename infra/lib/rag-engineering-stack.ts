import * as bedrock from "aws-cdk-lib/aws-bedrock"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as iam from "aws-cdk-lib/aws-iam"
import * as kms from "aws-cdk-lib/aws-kms"
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
    new cognito.UserPool(this,"UserPool", {
      selfSignUpEnabled:false,
      signInAliases:{ email:true },
      mfa:cognito.Mfa.OPTIONAL,
      passwordPolicy:{ minLength:14, requireDigits:true, requireLowercase:true, requireUppercase:true, requireSymbols:true },
      accountRecovery:cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy:cdk.RemovalPolicy.RETAIN
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
    new bedrock.CfnDataSource(this,"DataSource", {
      knowledgeBaseId:knowledgeBase.attrKnowledgeBaseId,
      name:"authorized-source",
      dataSourceConfiguration:{ type:"S3", s3Configuration:{ bucketArn:source.bucketArn, inclusionPrefixes:["source/"] } },
      vectorIngestionConfiguration:{ chunkingConfiguration:{ chunkingStrategy:"FIXED_SIZE", fixedSizeChunkingConfiguration:{ maxTokens:300, overlapPercentage:20 } } },
      dataDeletionPolicy:"RETAIN"
    })
    new cdk.CfnOutput(this,"SourceBucketName", { value:source.bucketName })
    new cdk.CfnOutput(this,"KnowledgeBaseId", { value:knowledgeBase.attrKnowledgeBaseId })
  }
}
