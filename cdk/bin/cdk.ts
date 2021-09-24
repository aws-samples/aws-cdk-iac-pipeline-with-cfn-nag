#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { EksStack } from '../lib/eks-stack';

const app = new cdk.App();

const region = process.env.AWS_REGION
const toolchain_account_id = process.env.TOOLCHAIN_ACCOUNT
const target_account_id = process.env.TARGET_ACCOUNT

function setEnv(target_account_id: string) {
    return {
        Region: region,
        env: {
            account: target_account_id,
            region: region,
        },
        trustedAccount: toolchain_account_id,
    }
}
if (!target_account_id) throw Error("NO VALUE ON TARGET ACCOUNT ID")

new EksStack(app, 'CdkStack-IaC', {
    ...setEnv(target_account_id)
});