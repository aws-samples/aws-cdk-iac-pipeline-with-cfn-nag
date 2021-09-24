import * as cdk from '@aws-cdk/core';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam';
export class IaCPipelineStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repo = new codecommit.Repository(this, 'Repository', {
      repositoryName: 'codecommit-for-iac',
      description: 'Repository for IaC Sample',
    });

    const cdkSynth = new codebuild.PipelineProject(this, 'CdkSynth', {
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.synth.yaml"),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_2
      },
      environmentVariables: {
        "TARGET_ACCOUNT": { value: '118309272831' }
      }
    });

    const cfnNag = new codebuild.PipelineProject(this, 'CfnNag', {
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.validation.yaml"),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_2
      },
    });

    const cdkDevDeploy = new codebuild.PipelineProject(this, 'CdkDevDeploy', {
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.dev.deploy.yaml"),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_2
      },
      environmentVariables: {
        "TARGET_ACCOUNT": { value: '118309272831' }
      }
    });

    const cdkPrdDeploy = new codebuild.PipelineProject(this, 'CdkPrdDeploy', {
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.prd.deploy.yaml"),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_2
      },
      environmentVariables: {
        "TARGET_ACCOUNT": { value: '216944898468' }
      }
    });

    cdkSynth.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sts:AssumeRole'],
      resources: ['arn:aws:iam::091700113757:role/cdk*', 'arn:aws:iam::118309272831:role/cdk*'],
    }));

    cdkDevDeploy.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sts:AssumeRole'],
      resources: ['arn:aws:iam::091700113757:role/cdk*', 'arn:aws:iam::118309272831:role/cdk*'],
    }));

    cdkPrdDeploy.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sts:AssumeRole'],
      resources: ['arn:aws:iam::091700113757:role/cdk*', 'arn:aws:iam::216944898468:role/cdk*'],
    }));

    const sourceOutput = new codepipeline.Artifact();
    const cdkBuildOutput = new codepipeline.Artifact('CdkBuildOutput');
    const cdkCfnNagOutput = new codepipeline.Artifact('CdkCfnNagOutput');

    new codepipeline.Pipeline(this, 'Pipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.CodeCommitSourceAction({
              actionName: 'CodeCommit_Source',
              branch: 'main',
              repository: repo,
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CDK_Synth',
              project: cdkSynth,
              input: sourceOutput,
              outputs: [cdkBuildOutput],
            }),
          ],
        },
        {
          stageName: 'Validation',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CFN_nag',
              project: cfnNag,
              input: cdkBuildOutput,
              outputs: [cdkCfnNagOutput],
            }),
          ],
        },
        {
          stageName: 'DEV-Deploy',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Deploy',
              project: cdkDevDeploy,
              input: sourceOutput
            }),
          ],
        },
        {
          stageName: 'Manual-approval',
          actions: [
            new codepipeline_actions.ManualApprovalAction({
              actionName: 'ApproveChanges'
            }),
          ],
        },
        {
          stageName: 'Prd-Deploy',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Deploy',
              project: cdkPrdDeploy,
              input: sourceOutput
            }),
          ],
        },
      ],
    });
  }
}
