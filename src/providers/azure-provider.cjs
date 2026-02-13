const tl = require('azure-pipelines-task-lib/task')
const { HttpClient } = require('@actions/http-client')
const { BaseProvider } = require('./base-provider.cjs')

class AzureProvider extends BaseProvider {
  _getEnvInputKey(name) {
    return 'INPUT_' + name.replace(/([a-z])([A-Z])/g, '$1_$2')  // camelCase to snake_case
      .replace(/([a-z])([A-Z])/g, '$1_$2')  // camelCase to snake_case
      .replace(/\./g, '_')
      .replace(/ /g, '_')
      .toUpperCase();
  }

  _getFromEnv(name) {
    return process.env[this._getEnvInputKey(name)];  
  }

  getInput(name) {
    return tl.getInput(name, false) || this._getFromEnv(name)
  }

  debug(message) {
    tl.debug(message)
  }

  info(message) {
    console.log(message)
  }

  warning(message) {
    tl.warning(message)
  }

  setFailed(message) {
    tl.setResult(tl.TaskResult.Failed, message)
  }

  getContext() {
    return {
      ref_name: (process.env.BUILD_SOURCEBRANCH || '')
        .replace(/^refs\/heads\//, '')
        .replace(/^refs\/tags\//, ''),
      sha: process.env.BUILD_SOURCEVERSION || '',
    }
  }

  createRunContext() {
    const apiKey = this.getInput('apiKey')
    const context = this.getContext()

    return {
      context,
      orgId: this.getInput('orgId'),
      apiKey,
      apiHostname: this.getInput('apiHostname'),
      bundlePrefix: this.getInput('bundlePrefix'),
      pagebuilderVersion: this.getInput('pagebuilderVersion') || 'latest',
      artifact: this.getInput('artifact') || 'dist/fusion-bundle.zip',
      retryCount: parseInt(this.getInput('retryCount') || '10'),
      retryDelay: parseInt(this.getInput('retryDelay') || '5'),
      minimumRunningVersions: parseInt(this.getInput('minimumRunningVersions') || '7'),
      terminateRetryCount: parseInt(this.getInput('terminateRetryCount') || '3'),
      terminateRetryDelay: parseInt(this.getInput('terminateRetryDelay') || '10'),
      shouldDeploy: this.getInput('deploy') !== 'false',
      shouldPromote: this.getInput('promote') !== 'false',
      client: new HttpClient('nodejs - Azure Pipelines - arcxp/deploy-action', [], {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
      core: this._createCoreInterface(),
    }
  }
}

module.exports = { AzureProvider }
