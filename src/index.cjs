const { createProvider } = require('./providers')

const { getCurrentVersions } = require('./phases/current-versions.cjs')
const { uploadArtifact } = require('./phases/upload.cjs')
const { terminateOldestVersion } = require('./phases/terminate-oldest.cjs')
const { promoteNewVersion } = require('./phases/promote-version.cjs')
const { deployLatestVersion } = require('./phases/deploy-version.cjs')
const {
  verifyMinimumRunningVersions,
  verifyArcHost,
  verifyPageBuilderVersion,
} = require('./validation.cjs')

const provider = createProvider()
const runContext = provider.createRunContext()

runContext.bundleName = [
  runContext.bundlePrefix ?? 'bundle',
  new Date().getTime(),
  runContext.context.ref_name,
  runContext.context.sha,
].join('-')

const retryDelayWait = () =>
  new Promise((res) => setTimeout(() => res(), runContext.retryDelay * 1000))

const main = async () => {
  // A little validation
  verifyMinimumRunningVersions(runContext)
  verifyArcHost(runContext)
  verifyPageBuilderVersion(runContext)

  if (runContext.shouldDeploy === false && runContext.shouldPromote === true) {
    return runContext.core.setFailed('If `promote` is true, `deploy` must also be true.')
  }

  const currentVersions = await getCurrentVersions(runContext)
  runContext.core.debug('currentVersions', JSON.stringify(currentVersions, undefined, 2))

  if (!Array.isArray(currentVersions) || !currentVersions.length) {
    return runContext.core.setFailed('Unable to determine current versions.')
  }

  const oldestVersion = currentVersions[0]
  const latestVersion = currentVersions[currentVersions.length - 1]

  await uploadArtifact(runContext)

  if (runContext.shouldDeploy) {
    await deployLatestVersion(runContext)

    // Don't terminate if there aren't more versions than one.
    if (currentVersions.length > runContext.minimumRunningVersions) {
      const termResults = terminateOldestVersion(runContext, oldestVersion)
      runContext.core.debug(
        'terminateOldestVersionResults',
        JSON.stringify(termResults, undefined, 2),
      )
    }

    let retriesRemaining = runContext.retryCount

    let newestVersion = undefined
    // Wait for the internal deployer to do its thing.
    while (retriesRemaining >= 0) {
      const newVersions = await getCurrentVersions(runContext)
      runContext.core.debug(`New versions: ${JSON.stringify(newVersions, undefined, 2)}`)
      if (!!newVersions && newVersions[newVersions.length - 1] !== latestVersion) {
        newestVersion = newVersions[newVersions.length - 1]
        break
      }
      await retryDelayWait()
      retriesRemaining -= 1
    }

    // If we didn't identify the new version, that means we timed out. Boo.
    if (!newestVersion) {
      return runContext.core.setFailed(
        `We retried ${runContext.retryCount} times with ${runContext.retryDelay} seconds between retries. Unfortunately, the new version does not appear to have deployed successfully. Please check logs, and contact support if this problem continues.\n\nYou may wish to retry this action again, but with debugging enabled.`,
      )
    }

    runContext.newestVersion = newestVersion
  }
  if (runContext.shouldPromote) {
    await promoteNewVersion(runContext)
  }
}

main().finally(() => runContext.core.debug('Finished.'))
