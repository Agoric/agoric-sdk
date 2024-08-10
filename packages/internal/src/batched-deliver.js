// @jessie-check
// @ts-check

export const DEFAULT_BATCH_TIMEOUT_MS = 1000;

/**
 * @typedef {(message: unknown[], ackNum: number) => Promise<void>} DeliverMessages
 */

/**
 * @param {DeliverMessages} deliver
 * @param {{
 *   clearTimeout: import('node:timers').clearTimeout;
 *   setTimeout: import('node:timers').setTimeout;
 * }} io
 * @param {number} batchTimeoutMs
 */
export function makeBatchedDeliver(
  deliver,
  { clearTimeout, setTimeout },
  batchTimeoutMs = DEFAULT_BATCH_TIMEOUT_MS,
) {
  /** @type {unknown[]} */
  let batchedMessages = [];
  let latestAckNum = 0;
  /** @type {NodeJS.Timeout} */
  let deliverTimeout;

  /**
   * @type {DeliverMessages}
   */
  async function batchedDeliver(newMessages, ackNum) {
    // If we have no existing messages, reset the deliver timeout.
    //
    // This defers sending an ack until the timeout expires or we have new
    // messages.
    if (!batchedMessages.length) {
      clearTimeout(deliverTimeout);
      deliverTimeout = setTimeout(() => {
        // Transfer the batched messages to the deliver function.
        const msgs = batchedMessages;
        batchedMessages = [];
        void deliver(msgs, latestAckNum);
      }, batchTimeoutMs);
    }

    // Add new messages to the batch.
    batchedMessages.push(...newMessages);
    if (ackNum > latestAckNum) {
      // Increase the latest ack.
      latestAckNum = ackNum;
    }
  }

  return batchedDeliver;
}
