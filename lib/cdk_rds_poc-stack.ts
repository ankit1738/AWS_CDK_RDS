import * as cdk from "aws-cdk-lib";
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";
import { Architecture, IFunction } from "aws-cdk-lib/aws-lambda";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkRdsPocStack extends cdk.Stack {
  public readonly lambdaHandler: lambda.Function;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //configure VPC here
    const vpc = new Vpc(this, "MySql-VPC", {
      cidr: "10.0.0.0/16",
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: "MySql-Vpc-PublicSubnet",
          subnetType: SubnetType.PUBLIC,
        },
        {
          name: "MySql-Vpc-PrivateSubnet",
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    //configure Securtiy groups here
    const lambdaSecurityGroup = new SecurityGroup(this, "MySql-lambda-sg", {
      vpc,
      allowAllOutbound: true,
      description: "security group for a lambda",
    });

    const rdsSecurityGroup = new SecurityGroup(this, "MySql-rds-sg", {
      vpc,
      allowAllOutbound: true,
      description: "security group for a rds",
    });

    //IMPORTANT: Add inbound rule in rds for lambda security group.
    // Add this SG in the rds instance
    rdsSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      Port.tcp(3306),
      "allow lambda to connect"
    );

    // rdsSecurityGroup.addIngressRule(
    //   Peer.anyIpv4(),
    //   Port.tcp(443),
    //   "allow HTTPS traffic from anywhere"
    // );

    //configur RDS here
    const dbInstance = new rds.DatabaseInstance(this, "MySql-rds-instance", {
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0_28,
      }),
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      credentials: rds.Credentials.fromGeneratedSecret("admin"),
      multiAz: false,
      allocatedStorage: 19,
      maxAllocatedStorage: 20,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(0),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      databaseName: "MySqlDb",
      publiclyAccessible: false,
      securityGroups: [rdsSecurityGroup], //IMPORTANT: adding the rds sg here with lambda access
    });

    //configure lambda here
    this.lambdaHandler = new NodejsFunction(this, "MySql-lambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      // code: lambda.Code.fromAsset("lambda"),
      entry: path.join(__dirname, `../lambda/itemLambda.ts`),
      architecture: Architecture.ARM_64,
      // handler: "itemLambda.handler",
      vpc: vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [lambdaSecurityGroup],
    });

    this.lambdaHandler.addToRolePolicy(
      new PolicyStatement({
        resources: ["*"],
        actions: ["dynamodb:*", "s3:*", "rds:*", "ec2:*"],
      })
    );

    const api = new apigateway.RestApi(this, "MySql-apigw");
    const items = api.root.addResource("items");
    items.addMethod(
      "GET",
      new LambdaIntegration(this.lambdaHandler, {
        requestTemplates: {
          "application/json": `{"statusCode" : 200}`,
        },
      })
    );

    //configure RDS here
  }
}
