export const DEFAULT_BATCH_TIMEOUT_MS = 1000;

/**
 * @typedef {(message: any[], ackNum: number) => void} DeliverMessages
 */

/**
 *
 * @param {DeliverMessages} deliver
 * @param {{ clearTimeout: NodeJS.clearTimeout, setTimeout: NodeJS.setTimeout }} io
 * @param {number} batchTimeoutMs
 */
export function makeBatchedDeliver(
  deliver,
  { clearTimeout, setTimeout },
  batchTimeoutMs = DEFAULT_BATCH_TIMEOUT_MS,
) {
  let batchedMessages = [];
  let latestAckNum = 0;
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
        deliver(msgs, latestAckNum);
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
