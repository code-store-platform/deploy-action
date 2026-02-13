const { GitHubProvider } = require('./github-provider.cjs')
const { AzureProvider } = require('./azure-provider.cjs')
const { GitLabProvider } = require('./gitlab-provider.cjs')

const createProvider = () => {
  if (process.env.GITHUB_ACTIONS) {
    return new GitHubProvider()
  } else if (process.env.TF_BUILD) {
    return new AzureProvider()
  } else if (process.env.GITLAB_CI) {
    return new GitLabProvider()
  } else {
    console.warn('Unsupported CI environment. Expected GitHub Actions, Azure Pipelines, or GitLab CI. Using GitHub Actions as a fallback.')
    return new GitHubProvider()
  }
}

module.exports = { createProvider }
