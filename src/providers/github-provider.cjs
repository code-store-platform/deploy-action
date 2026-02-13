const core = require('@actions/core')
const github = require('@actions/github')
const { HttpClient } = require('@actions/http-client')
const { BaseProvider } = require('./base-provider.cjs')

class GitHubProvider extends BaseProvider {
  getInput(name) {
    return core.getInput(name)
  }

  debug(message) {
    core.debug(message)
  }

  info(message) {
    core.info(message)
  }

  warning(message) {
    core.warning(message)
  }

  setFailed(message) {
    core.setFailed(message)
  }

  getContext() {
    return {
      ref_name: github.context.ref_name,
      sha: github.context.sha,
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
      shouldDeploy: ['true', true].includes(this.getInput('deploy')),
      shouldPromote: ['true', true].includes(this.getInput('promote')),
      client: new HttpClient('nodejs - GitHub Actions - arcxp/deploy-action', [], {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
      core: this._createCoreInterface(),
    }
  }
}

module.exports = { GitHubProvider }
