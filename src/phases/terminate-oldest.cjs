const terminateOldestVersion = async (
  { core, client, apiHostname, terminateRetryCount, terminateRetryDelay },
  oldestVersion
) => {
  // Local retry delay function
  const retryDelay = seconds => new Promise(res => setTimeout(() => res(), seconds * 1000));

  const result = {
    version: oldestVersion,
    success: false,
    attempts: [],
    finalError: null
  };

  if (!oldestVersion) {
    const error = 'Unable to detect the oldest version';
    core.warning(error);
    result.finalError = error;
    return result;
  }

  const url = `https://${apiHostname}/deployments/fusion/services/${oldestVersion}/terminate`;
  const maxAttempts = parseInt(terminateRetryCount) || 3;
  const delaySeconds = parseInt(terminateRetryDelay) || 10;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      core.debug(`Attempt ${attempt}/${maxAttempts}: Terminating version ${oldestVersion}`);

      const response = await client.post(url);
      result.attempts.push({
        attempt,
        success: true,
        timestamp: new Date().toISOString(),
        status: response.statusCode
      });

      core.info(`Successfully terminated version ${oldestVersion} on attempt ${attempt}`);
      result.success = true;
      return result;
    } catch (err) {
      result.attempts.push({
        attempt,
        success: false,
        timestamp: new Date().toISOString(),
        error: err.message
      });

      core.warning(`Attempt ${attempt}/${maxAttempts} failed to terminate version ${oldestVersion}: ${err.message}`);

      if (attempt < maxAttempts) {
        core.debug(`Waiting ${delaySeconds} seconds before retry...`);
        await retryDelay(delaySeconds);
      } else {
        result.finalError = err.message;
        core.warning(
          `Failed to terminate version ${oldestVersion} after ${maxAttempts} attempts. Proceeding with deployment. Error: ${err.message}`
        );
      }
    }
  }

  return result;
};

module.exports = { terminateOldestVersion };
