import * as cdk from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks'

export class EksStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cluster = new eks.Cluster(this, 'hello-eks', {
      version: eks.KubernetesVersion.V1_21,
    });
  }
}
