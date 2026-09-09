import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";

export interface SiteStackProps extends cdk.StackProps {
  /** Apex domain, e.g. leok87x.com. The site is served from www.<domainName>. */
  domainName: string;
  /** Route53 hosted zone id for domainName. */
  hostedZoneId: string;
}

/**
 * Static site on S3 + CloudFront.
 *
 * - www.<domain>  -> CloudFront -> private S3 bucket (OAC)
 * - <domain>      -> CloudFront -> 301 to https://www.<domain>/<path>
 * - One ACM cert (us-east-1) covering both names, DNS-validated in Route53.
 * - Site content is the repo root, uploaded on every deploy with a CloudFront invalidation.
 */
export class SiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    const apex = props.domainName;
    const www = `www.${apex}`;

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: props.hostedZoneId,
      zoneName: apex,
    });

    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: www,
      subjectAlternativeNames: [apex],
      validation: acm.CertificateValidation.fromDns(zone),
    });

    const bucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const origin = origins.S3BucketOrigin.withOriginAccessControl(bucket);

    const urlRewrite = new cloudfront.Function(this, "UrlRewrite", {
      functionName: "leok87x-url-rewrite",
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(__dirname, "../functions/url-rewrite.js"),
      }),
      comment: "Serve index.html for directory URLs; add trailing slash to extension-less paths",
    });

    const apexRedirect = new cloudfront.Function(this, "ApexRedirect", {
      functionName: "leok87x-apex-redirect",
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(__dirname, "../functions/apex-redirect.js"),
      }),
      comment: `301 ${apex} -> ${www}`,
    });

    const wwwDistribution = new cloudfront.Distribution(this, "WwwDistribution", {
      comment: www,
      domainNames: [www],
      certificate,
      defaultRootObject: "index.html",
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        functionAssociations: [
          { function: urlRewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
        ],
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 404, responsePagePath: "/404.html", ttl: cdk.Duration.minutes(5) },
        { httpStatus: 404, responseHttpStatus: 404, responsePagePath: "/404.html", ttl: cdk.Duration.minutes(5) },
      ],
    });

    const apexDistribution = new cloudfront.Distribution(this, "ApexDistribution", {
      comment: `${apex} -> ${www}`,
      domainNames: [apex],
      certificate,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        // Never reached: the function returns a redirect before the origin is contacted.
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        functionAssociations: [
          { function: apexRedirect, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
        ],
      },
    });

    for (const [name, distribution, label] of [
      [www, wwwDistribution, "Www"],
      [apex, apexDistribution, "Apex"],
    ] as const) {
      const target = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution));
      new route53.ARecord(this, `${label}AliasA`, { zone, recordName: name, target });
      new route53.AaaaRecord(this, `${label}AliasAAAA`, { zone, recordName: name, target });
    }

    new s3deploy.BucketDeployment(this, "DeploySite", {
      destinationBucket: bucket,
      distribution: wwwDistribution,
      distributionPaths: ["/*"],
      prune: true,
      cacheControl: [
        s3deploy.CacheControl.setPublic(),
        s3deploy.CacheControl.maxAge(cdk.Duration.minutes(5)),
        s3deploy.CacheControl.mustRevalidate(),
      ],
      sources: [
        s3deploy.Source.asset(path.join(__dirname, "../.."), {
          exclude: [
            ".git",
            ".git/**",
            ".gitignore",
            ".DS_Store",
            "**/.DS_Store",
            "README.md",
            "infra",
            "infra/**",
          ],
        }),
      ],
    });

    new cdk.CfnOutput(this, "SiteUrl", { value: `https://${www}/` });
    new cdk.CfnOutput(this, "BucketName", { value: bucket.bucketName });
    new cdk.CfnOutput(this, "WwwDistributionId", { value: wwwDistribution.distributionId });
    new cdk.CfnOutput(this, "ApexDistributionId", { value: apexDistribution.distributionId });
  }
}
