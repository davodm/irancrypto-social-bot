/**
 * Normalized result from content posting functions (makeTweet, makeTelegram, makeInstagram).
 * Poster uses this to decide whether to remove the DynamoDB schedule row and what to log.
 */

/**
 * @param {string} platform
 * @param {string} target
 * @param {Record<string, unknown>} summary
 */
export function postSuccess(platform, target, summary = {}) {
  return { posted: true, platform, target, summary };
}

/**
 * @param {string} platform
 * @param {string} target
 * @param {string} reason
 * @param {Record<string, unknown>} [details]
 */
export function postSkipped(platform, target, reason, details = {}) {
  return { posted: false, platform, target, reason, ...details };
}
