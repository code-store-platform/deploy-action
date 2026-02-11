# Using Deploy to Arc XP in Azure Pipelines

This document describes how to use the Arc XP deploy task in your Azure Pipelines.

## What is a Git Submodule?

A **Git submodule** allows you to include an external Git repository as a subdirectory in your own repository. This is useful for:
- Keeping shared tools and libraries in a separate repository
- Reusing code without duplicating it
- Maintaining a single source of truth

In this case, we use a submodule to include the `deploy-action` repository in your project, giving you access to the `azure-task.json` definition.

## Setup: Adding as a Submodule

### Step 1: Add the submodule to your project

```bash
git submodule add https://github.com/code-store-platform/deploy-action.git deploy-action
```

This will:
- Clone the repository into a `deploy-action` directory
- Create a `.gitmodules` file tracking the submodule
- Commit the submodule reference to your repository

### Step 2: Update after cloning

If you clone a repository that already has this submodule, run:

```bash
git submodule update --init --recursive
```

Or during initial clone:

```bash
git clone --recurse-submodules <your-repo-url>
```

## Using the Azure Task

Add the following to your `azure-pipelines.yml`:

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
          - publish: $(Build.ArtifactStagingDirectory)
            artifact: drop

  - stage: Deploy
    dependsOn: Build
    jobs:
      - job: DeployJob
        steps:
          - task: deploy-action/azure-task.json@2
            inputs:
              orgId: $(ARC_XP_ORG_ID)
              apiKey: $(ARC_XP_API_KEY)
              apiHostname: $(ARC_XP_API_HOSTNAME)
              bundlePrefix: 'my-bundle'
              artifact: 'dist/fusion-bundle.zip'
```

## Configuration

The task accepts the following inputs:

### Required Inputs

- **orgId** - The Arc XP organization ID
- **apiKey** - The Arc XP API key (use Azure Pipelines secrets)
- **apiHostname** - The Arc XP API hostname (e.g., `api.sandbox.org.arcpublishing.com`)
- **bundlePrefix** - The prefix for the bundle name used to identify it in Arc XP UI

### Optional Inputs

- **pagebuilderVersion** - The PageBuilder version to deploy with (default: `latest`)
- **artifact** - Path to the artifact to upload (default: `dist/fusion-bundle.zip`)
- **retryCount** - Number of retry attempts on failure (default: `10`)
- **retryDelay** - Seconds to wait between retries (default: `5`)
- **minimumRunningVersions** - Minimum number of versions to keep deployed (default: `7`, max: `10`)
- **terminateRetryCount** - Times to retry terminating oldest build if it fails (default: `3`)
- **terminateRetryDelay** - Seconds between termination retries (default: `10`)
- **deploy** - Whether to deploy the bundle (default: `true`)
- **promote** - Whether to promote the deployed version (default: `true`)

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
  - buildConfiguration: 'Release'

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

          - task: PublishBuildArtifacts@1
            inputs:
              pathToPublish: 'dist/fusion-bundle.zip'
              artifactName: 'bundle'
            displayName: 'Publish artifact'

  - stage: Deploy
    displayName: 'Deploy to Arc XP'
    dependsOn: Build
    condition: succeeded()
    jobs:
      - job: DeployJob
        displayName: 'Deploy'
        steps:
          - task: deploy-action/azure-task.json@2
            inputs:
              orgId: $(ARC_XP_ORG_ID)
              apiKey: $(ARC_XP_API_KEY)
              apiHostname: $(ARC_XP_API_HOSTNAME)
              bundlePrefix: 'my-bundle'
              pagebuilderVersion: 'latest'
              artifact: 'dist/fusion-bundle.zip'
              retryCount: '10'
              minimumRunningVersions: '7'
            displayName: 'Deploy PageBuilder bundle'
```

## Managing Submodules

### Update submodule to latest version

```bash
git submodule update --remote deploy-action
```

### Remove a submodule

```bash
git submodule deinit -f deploy-action
rm -rf .git/modules/deploy-action
git rm -f deploy-action
git commit -m "Remove deploy-action submodule"
```

## Troubleshooting

### Submodule shows as "dirty"

```bash
git submodule update --init --recursive
```

### Task not found error

Ensure:
1. The submodule is properly initialized: `git submodule update --init`
2. The path in the task reference matches your submodule directory
3. You're using the correct task version (`@2`)
