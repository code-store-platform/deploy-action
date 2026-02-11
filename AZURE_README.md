# Using Deploy to Arc XP in Azure Pipelines

This document describes how to use the Arc XP deploy task in your Azure Pipelines.

## What is a Git Submodule?

A **Git submodule** allows you to include an external Git repository as a subdirectory in your own repository. This is useful for:
- Keeping shared tools and libraries in a separate repository
- Reusing code without duplicating it
- Maintaining a single source of truth

In this case, we use a submodule to include the `deploy-action` repository in your project, giving you access to the built deployment script.

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

## Using the Deploy Script

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
          - script: node ./deploy-action/dist/index.cjs
            displayName: 'Deploy to Arc XP'
            env:
              INPUT_ORG_ID: $(ARC_XP_ORG_ID)
              INPUT_API_KEY: $(ARC_XP_API_KEY)
              INPUT_API_HOSTNAME: $(ARC_XP_API_HOSTNAME)
              INPUT_BUNDLE_PREFIX: 'my-bundle'
              INPUT_ARTIFACT: 'dist/fusion-bundle.zip'
```

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
          - checkout: self
            fetchDepth: 0
            submodules: recursive

          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
            displayName: 'Install Node.js'

          - script: node ./deploy-action/dist/index.cjs
            displayName: 'Deploy PageBuilder bundle'
            env:
              INPUT_ORG_ID: $(ARC_XP_ORG_ID)
              INPUT_API_KEY: $(ARC_XP_API_KEY)
              INPUT_API_HOSTNAME: $(ARC_XP_API_HOSTNAME)
              INPUT_BUNDLE_PREFIX: 'my-bundle'
              INPUT_PAGEBUILDER_VERSION: 'latest'
              INPUT_ARTIFACT: 'dist/fusion-bundle.zip'
              INPUT_RETRY_COUNT: '10'
              INPUT_MINIMUM_RUNNING_VERSIONS: '7'
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
