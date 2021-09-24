#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { IaCPipelineStack } from '../lib/iac-pipeline-stack';

const app = new cdk.App();
new IaCPipelineStack(app, 'IaCPipelineStack');
