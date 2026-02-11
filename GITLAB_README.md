# Using Deploy to Arc XP in GitLab CI

This document describes how to use the Arc XP deploy action in your GitLab CI pipeline.

## Quick Start

Add the following to your `.gitlab-ci.yml`:

```yaml
include:
  - remote: 'https://github.com/code-store-platform/deploy-action/raw/main/.gitlab/ci/deploy-arcxp.yml'

deploy_to_arcxp:
  extends: .deploy_to_arcxp
  variables:
    ARC_XP_ORG_ID: $ARC_XP_ORG_ID
    ARC_XP_API_KEY: $ARC_XP_API_KEY
    ARC_XP_API_HOSTNAME: $ARC_XP_API_HOSTNAME
    BUNDLE_PREFIX: "my-bundle"
```

## Configuration

The job template uses the following input variables:

### Required Variables

- **ARC_XP_ORG_ID** - The Arc XP organization ID
- **ARC_XP_API_KEY** - The Arc XP API key (use GitLab masked variables for secrets)
- **ARC_XP_API_HOSTNAME** - The Arc XP API hostname (e.g., `api.sandbox.org.arcpublishing.com`)
- **BUNDLE_PREFIX** - The prefix for the bundle name used to identify it in Arc XP UI

### Optional Variables

- **PAGEBUILDER_VERSION** - The PageBuilder version to deploy with (default: `latest`)
- **ARTIFACT** - Path to the artifact to upload (default: `dist/fusion-bundle.zip`)
- **RETRY_COUNT** - Number of retry attempts on failure (default: `10`)
- **RETRY_DELAY** - Seconds to wait between retries (default: `5`)
- **MINIMUM_RUNNING_VERSIONS** - Minimum number of versions to keep deployed (default: `7`, max: `10`)
- **TERMINATE_RETRY_COUNT** - Times to retry terminating oldest build if it fails (default: `3`)
- **TERMINATE_RETRY_DELAY** - Seconds between termination retries (default: `10`)
- **DEPLOY** - Whether to deploy the bundle (default: `true`)
- **PROMOTE** - Whether to promote the deployed version (default: `true`)

## Setting Up GitLab CI Variables

1. Go to **Settings → CI/CD → Variables** in your GitLab project
2. Add the following masked variables:
   - `ARC_XP_ORG_ID` - Your Arc XP organization ID
   - `ARC_XP_API_KEY` - Your Arc XP API key (mark as masked)
   - `ARC_XP_API_HOSTNAME` - Your Arc XP API hostname

## Full Example

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/fusion-bundle.zip

include:
  - remote: 'https://github.com/code-store-platform/deploy-action/raw/main/.gitlab/ci/deploy-arcxp.yml'

deploy_to_arcxp:
  extends: .deploy_to_arcxp
  needs: ["build"]
  variables:
    ARC_XP_ORG_ID: $ARC_XP_ORG_ID
    ARC_XP_API_KEY: $ARC_XP_API_KEY
    ARC_XP_API_HOSTNAME: $ARC_XP_API_HOSTNAME
    BUNDLE_PREFIX: "my-bundle"
    PAGEBUILDER_VERSION: "latest"
```

## Notes

- The job will only run on the `main` branch by default
- Built-in retry logic handles temporary failures
- Ensure your artifact path matches what you specify in the `ARTIFACT` variable
