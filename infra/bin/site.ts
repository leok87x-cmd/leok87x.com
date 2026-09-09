#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SiteStack } from "../lib/site-stack";

const app = new cdk.App();

new SiteStack(app, "Leok87xSite", {
  // us-east-1 is required: CloudFront only accepts ACM certificates from this region.
  env: { account: "274286556114", region: "us-east-1" },
  domainName: "leok87x.com",
  hostedZoneId: "Z06799012LH3V20124PU5",
  description: "Static site for www.leok87x.com with apex redirect",
});
