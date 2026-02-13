# Using Deploy to Arc XP in Azure Pipelines

This document describes how to use the Arc XP deploy task in your Azure Pipelines.

## Quick Start

Copy the template to your repository and reference it:

```bash
mkdir -p .azure
cp azure-templates.yml .azure/deploy-template.yml
```

Then add to your `azure-pipelines.yml`:

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
          - script: npm ci && npm run build
            displayName: 'Install and build'

  - stage: Deploy
    dependsOn: Build
    jobs:
      - job: DeployJob
        steps:
          - template: .azure/deploy-template.yml
            parameters:
              orgId: $(ARC_XP_ORG_ID)
              apiKey: $(ARC_XP_API_KEY)
              apiHostname: $(ARC_XP_API_HOSTNAME)
              bundlePrefix: 'my-bundle'
              artifact: 'dist/fusion-bundle.zip'
```

The template will:
1. Download the latest deployment script from GitHub (feature/azure-provider branch)
2. Set up the required environment variables
3. Run the deployment

## Configuration

The script accepts inputs via environment variables with the `INPUT_` prefix:

### Required Variables

- **INPUT_ORG_ID** - The Arc XP organization ID
- **INPUT_API_KEY** - The Arc XP API key (use Azure Pipelines secrets)
- **INPUT_API_HOSTNAME** - The Arc XP API hostname (e.g., `api.sandbox.org.arcpublishing.com`)
- **INPUT_BUNDLE_PREFIX** - The prefix for the bundle name used to identify it in Arc XP UI

### Optional Variables

- **INPUT_PAGEBUILDER_VERSION** - The PageBuilder version to deploy with (default: `latest`)
- **INPUT_ARTIFACT** - Path to the artifact to upload (default: `dist/fusion-bundle.zip`)
- **INPUT_RETRY_COUNT** - Number of retry attempts on failure (default: `10`)
- **INPUT_RETRY_DELAY** - Seconds to wait between retries (default: `5`)
- **INPUT_MINIMUM_RUNNING_VERSIONS** - Minimum number of versions to keep deployed (default: `7`, max: `10`)
- **INPUT_TERMINATE_RETRY_COUNT** - Times to retry terminating oldest build if it fails (default: `3`)
- **INPUT_TERMINATE_RETRY_DELAY** - Seconds between termination retries (default: `10`)
- **INPUT_DEPLOY** - Whether to deploy the bundle (default: `true`)
- **INPUT_PROMOTE** - Whether to promote the deployed version (default: `true`)

## Setting Up Variables in Azure Pipelines

1. Go to **Pipelines** → **Library** → **Variable groups**
2. Create a new variable group named `arcxp-secrets`
3. Add the following variables (mark API key as secret):
   - `ARC_XP_ORG_ID` - Your Arc XP organization ID
   - `ARC_XP_API_KEY` - Your Arc XP API key (toggle as secret)
   - `ARC_XP_API_HOSTNAME` - Your Arc XP API hostname

4. Link the variable group in your pipeline:

```yaml
variables:
  - group: arcxp-secrets
```

## Full Example Pipeline

```yaml
trigger:
  - main

variables:
  - group: arcxp-secrets

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    displayName: 'Build PageBuilder Bundle'
    jobs:
      - job: BuildJob
        displayName: 'Build'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
            displayName: 'Install Node.js'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npm run build
            displayName: 'Build bundle'

  - stage: Deploy
    displayName: 'Deploy to Arc XP'
    dependsOn: Build
    condition: succeeded()
    jobs:
      - job: DeployJob
        displayName: 'Deploy'
        steps:
          - template: .azure/deploy-template.yml
            parameters:
              orgId: $(ARC_XP_ORG_ID)
              apiKey: $(ARC_XP_API_KEY)
              apiHostname: $(ARC_XP_API_HOSTNAME)
              bundlePrefix: 'my-bundle'
              pagebuilderVersion: 'latest'
              artifact: 'dist/fusion-bundle.zip'
              retryCount: '10'
              minimumRunningVersions: '7'
```

## How It Works

The template:
1. **Downloads** the latest deployment script from GitHub (branch: `feature/azure-provider`)
2. **Exports** all parameters as `INPUT_*` environment variables
3. **Executes** the Node.js script with those environment variables

## Multi-Environment Deployments

Deploy to multiple environments by creating separate variable groups:

```yaml
stages:
  - stage: DeployDev
    displayName: 'Deploy to Dev'
    jobs:
      - job: DeployJob
        variables:
          - group: arcxp-dev-secrets
        steps:
          - template: .azure/deploy-template.yml
            parameters:
              orgId: $(ARC_XP_ORG_ID)
              apiKey: $(ARC_XP_API_KEY)
              apiHostname: $(ARC_XP_API_HOSTNAME)
              bundlePrefix: 'my-bundle-dev'

  - stage: DeployProd
    displayName: 'Deploy to Production'
    dependsOn: DeployDev
    condition: succeeded()
    jobs:
      - job: DeployJob
        variables:
          - group: arcxp-prod-secrets
        steps:
          - template: .azure/deploy-template.yml
            parameters:
              orgId: $(ARC_XP_ORG_ID)
              apiKey: $(ARC_XP_API_KEY)
              apiHostname: $(ARC_XP_API_HOSTNAME)
              bundlePrefix: 'my-bundle-prod'
```

## Troubleshooting

### Download fails

If the deployment script fails to download:
- Check that your Azure Pipeline agent has internet access
- Verify the GitHub URL is correct and the branch exists
- Check firewall rules allow access to `raw.githubusercontent.com`

### Deployment fails with "Invalid credentials"

- Verify the variable group is linked: `variables: - group: arcxp-secrets`
- Ensure API key is marked as secret in the variable group
- Check that `orgId` and `apiHostname` match your Arc XP environment

### Wrong environment deployed

- Verify you're using the correct variable group for the stage
- Check that parameters are using the correct variable names (e.g., `$(ARC_XP_ORG_ID)` not `$(DEV_ORG_ID)`)
