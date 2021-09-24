# Simple IaC pipeline based CDK for multi account with Cfn-nag
A sample pipeline that allows you to manage your infrastructure via cdk while using the aws multi-account strategy. In this sample code, we will deploy AWS EKS with CDK via pipeline. Also, when deploying the infrastructure as a source, the pipeline includes a step that scans through the cfn-nag opensource to see if any vulnerabilities in the source are found. 

The guide below is written under the assumption that you can configure the aws cli, profile settings and cdk bootstraping.
To apply this sample, you need 3 aws accounts for the multi-account strategy. 

## About this pipeline
The pipeline consists of a total of 6 stages. All stages except source and manual approval are defined through codebuild buildspec yaml file. For this, you can search the yaml files located in the project root.
- Source 
- Build - synthesize cloudformation template
- Validation - vulnerabilities scanning with cfn-nag tool
- DEV-Deploy 
- Manual approval
- PRD-Deploy

![iac-pipeline](https://user-images.githubusercontent.com/27997183/134334939-3870ff8d-5a7e-4bcc-91bf-766a54031b8d.jpg)

The infrastructure to be deployed and the source of the pipeline are kept in codecommit, and the pipeline is triggered when a new source is committed. After that, in the pipeline, the code written in cdk is made into a cloudformation template through the synth process, and it is scanned for vulnerabilities through the cfn-nag tool. If CRITICAL is not found in the vulnerability scan, it will be deployed to the dev environment. After checking the DEV deployment result, you should approve manual approval stage on AWS Codepipeline, then deployment proceeds to the PRD environment.

For more detail about cfn-nag tool, please check this link : https://github.com/stelligent/cfn_nag

## Prerequisites
- 3 AWS accounts (1 for Toolchain, 1 for Dev workload, 1 for Prd Wordload)
- Setting aws profiles for 3 AWS accounts (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html)
- Setting git-remote-codecommit on local (https://github.com/aws/git-remote-codecommit)
## Deploy pipeline
### 1. Clone source

```
git clone https://github.com/aws-samples/aws-cdk-iac-pipeline-with-cfn-nag.git

```

### 2. Install pacakges
```
cd pipeline
npm install 
```

### 3. Set up CDK on Toolchain Account
```
# install CDK 
npm install -g aws-cdk

# Bootstraping CDK
CDK_NEW_BOOTSTRAP=1 cdk bootstrap --bootstrap-customer-key --cloudformation-execution-policies 'arn:aws:iam::aws:policy/AdministratorAccess' aws://${TOOLCHAIN_ACCOUNT_ID}/ap-northeast-2 --profile ${toolchain_account_profile}
```

** If you already did bootstraping, you can see below message
```
> CDK_NEW_BOOTSTRAP=1 cdk bootstrap --bootstrap-customer-key --cloudformation-execution-policies 'arn:aws:iam::aws:policy/AdministratorAccess' aws://xxxxxxxxxxxx/ap-northeast-2
CDK_NEW_BOOTSTRAP set, using new-style bootstrapping
 ⏳  Bootstrapping environment aws://xxxxxxxxxxxx/ap-northeast-2...
Trusted accounts for deployment: xxxxxxxxxxxx
Trusted accounts for lookup: (none)
Execution policies: arn:aws:iam::aws:policy/AdministratorAccess
 ✅  Environment aws://xxxxxxxxxxxx/ap-northeast-2 bootstrapped (no changes).
```

### 4. Deploy pipeline stack
Deploy pipeline stack on Toolchain account with cdk cli, you need to enter "y" after checking resources list that created with this stack.
```
cdk deploy -v --all --profile ${toolchain_account_profile}
```


## Deploy eks with pipeline

### 1. Set up CDK on DEV and Prd Account
```
# Bootstraping CDK on DEV
CDK_NEW_BOOTSTRAP=1 cdk bootstrap --bootstrap-customer-key --cloudformation-execution-policies 'arn:aws:iam::aws:policy/AdministratorAccess' --trust ${TOOLCHAIN_ACCOUNT_ID} aws://${DEV_ACCOUNT_ID}/ap-northeast-2 --profile ${dev_account_profile}

# Bootstraping CDK on PRD
CDK_NEW_BOOTSTRAP=1 cdk bootstrap --bootstrap-customer-key --cloudformation-execution-policies 'arn:aws:iam::aws:policy/AdministratorAccess' --trust ${TOOLCHAIN_ACCOUNT_ID} aws://${PRD_ACCOUNT_ID}/ap-northeast-2 --profile ${prd_account_profile}
```

** If you already did bootstraping, you can see below message
```
> CDK_NEW_BOOTSTRAP=1 cdk bootstrap --bootstrap-customer-key --cloudformation-execution-policies 'arn:aws:iam::aws:policy/AdministratorAccess' --trust xxxxxxxxxxxx aws://xxxxxxxxxxxx/ap-northeast-2 --profile mylz-dev
CDK_NEW_BOOTSTRAP set, using new-style bootstrapping
 ⏳  Bootstrapping environment aws://xxxxxxxxxxxx/ap-northeast-2...
Trusted accounts for deployment: xxxxxxxxxxxx
Trusted accounts for lookup: (none)
Execution policies: arn:aws:iam::aws:policy/AdministratorAccess
 ✅  Environment aws://xxxxxxxxxxxx/ap-northeast-2 bootstrapped (no changes).
```

### 2. Add additional policy on DEV and PRD cdk role
We use the cdk assume role plugin for multi-account deployment, which defaults to using the cdk-deploy-role created during the bootstrap process. However, since this role only has some privileges, additional privileges are required to deploy resources such as AWS EKS service.
```
# Add additional policy on DEV
aws iam attach-role-policy --role-name cdk-hnb659fds-deploy-role-${DEV_ACCOUNT_ID}-ap-northeast-2 --policy-arn arn:aws:iam::aws:policy/AdministratorAccess --profile ${dev_account_profile}

aws iam attach-role-policy --role-name cdk-hnb659fds-deploy-role-${PRD_ACCOUNT_ID}-ap-northeast-2 --policy-arn arn:aws:iam::aws:policy/AdministratorAccess --profile ${prd_account_profile}
```

After add policy, you can validate with below cli.
```
aws iam get-role --role-name cdk-hnb659fds-deploy-role-${DEV_ACCOUNT_ID}-ap-northeast-2 --profile ${dev_account_profile}

# result will be similiar with below
{
    "Role": {
        "Path": "/",
        "RoleName": "cdk-hnb659fds-deploy-role-xxxxxxxxxxxx-ap-northeast-2",
        "RoleId": "AROARXC6IHT7TIUMQJGDL",
        "Arn": "arn:aws:iam::xxxxxxxxxxxx:role/cdk-hnb659fds-deploy-role-xxxxxxxxxxxx-ap-northeast-2",
        "CreateDate": "2021-02-14T15:28:27+00:00",
        "AssumeRolePolicyDocument": {
            "Version": "2008-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::xxxxxxxxxxxx:root"
                    },
                    "Action": "sts:AssumeRole"
                },
                {
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::${TOOLCHAIN_ACCOUNT_ID}:root"
                    },
                    "Action": "sts:AssumeRole"
                }
            ]
        },
        "Description": "",
        "MaxSessionDuration": 3600,
        "Tags": [
            {
                "Key": "aws-cdk:bootstrap-role",
                "Value": "deploy"
            }
        ],
        "RoleLastUsed": {
            "LastUsedDate": "2021-09-22T10:49:25+00:00",
            "Region": "ap-northeast-2"
        }
    }
}
```

** If you skip this and try to deploy EKS with this pipeline, You will get an error on cloudformation like below.
```
User: arn:aws:sts::xxxxxxxxxxxx:assumed-role/cdk-hnb659fds-deploy-role-xxxxxxxxxxxx-ap-northeast-2/xxxxxxxxxxxx-1-session is not authorized to perform: eks:TagResource on resource: arn:aws:eks:ap-northeast-2:xxxxxxxxxxxx:cluster/helloeks5A23CE00-3823f9306184477cb816a5fe8d05f1b5 (Service: AmazonEKS; Status Code: 403; Error Code: AccessDeniedException; Request ID: af5c0782-dcd2-447c-8314-582edbaa26f7; Proxy: null)
```

### 3. Push IaC code to CodeCommit
There are several ways to push the source to codecommit, but here we will add a remote to push the source.
```
# Add new git-remote on cloning repo 
git remote add codecommit codecommit://default@codecommit-for-iac

# Push your source to Codecommit
git push -u codecommit main 
```

### 4. Check AWS Codepipeline on AWS management console on Toolchain Account
![check-pipeline](https://user-images.githubusercontent.com/27997183/134334749-f7c7c483-952c-48f5-868b-1a8901750383.png)
Now you can see running pipeline on AWS management console.


## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

