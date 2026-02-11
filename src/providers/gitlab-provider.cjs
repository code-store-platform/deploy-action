const { HttpClient } = require('@actions/http-client')
const { BaseProvider } = require('./base-provider.cjs')

class GitLabProvider extends BaseProvider {
  getInput(name) {
    return process.env[`INPUT_${name.toUpperCase().replace(/-/g, '_')}`] || ''
  }

  debug(message) {
    console.log(`[DEBUG] ${message}`)
  }

  info(message) {
    console.log(message)
  }

  warning(message) {
    console.warn(`[WARNING] ${message}`)
  }

  setFailed(message) {
    console.error(`[ERROR] ${message}`)
    process.exit(1)
  }

  getContext() {
    return {
      ref_name: process.env.CI_COMMIT_REF_NAME || '',
      sha: process.env.CI_COMMIT_SHA || '',
    }
  }

  createRunContext() {
    const apiKey = this.getInput('api-key')
    const context = this.getContext()

    return {
      context,
      orgId: this.getInput('org-id'),
      apiKey,
      apiHostname: this.getInput('api-hostname'),
      bundlePrefix: this.getInput('bundle-prefix'),
      pagebuilderVersion: this.getInput('pagebuilder-version') || 'latest',
      artifact: this.getInput('artifact') || 'dist/fusion-bundle.zip',
      retryCount: parseInt(this.getInput('retry-count') || '10'),
      retryDelay: parseInt(this.getInput('retry-delay') || '5'),
      minimumRunningVersions: parseInt(this.getInput('minimum-running-versions') || '7'),
      terminateRetryCount: parseInt(this.getInput('terminate-retry-count') || '3'),
      terminateRetryDelay: parseInt(this.getInput('terminate-retry-delay') || '10'),
      shouldDeploy: this.getInput('deploy') !== 'false',
      shouldPromote: this.getInput('promote') !== 'false',
      client: new HttpClient('nodejs - GitLab CI - arcxp/deploy-action', [], {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
      core: this._createCoreInterface(),
    }
  }
}

module.exports = { GitLabProvider }
