/* global setTimeout clearTimeout */
export const DEFAULT_BATCH_TIMEOUT_MS = 1000;

const { details: X } = assert;

export function makeBatchedDeliver(
  deliver,
  batchTimeoutMs = DEFAULT_BATCH_TIMEOUT_MS,
) {
  let batchedMessages = [];
  let latestAckNum = 0;
  let deliverTimeout;

  async function batchedDeliver(newMessages, ackNum, attempts = 0) {
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
        if (!msgs.length) {
          return;
        }
        deliver(msgs, latestAckNum).catch(e => {
          // Just retry later.
          const retryTimeoutMs = Math.ceil(
            Math.random() * Math.min(1000 * 2 ** attempts, 30000),
          );
          assert.note(
            e,
            X`batchedDeliver: deliver failed, retrying ${msgs.length} in ${
              retryTimeoutMs / 1000
            } seconds`,
          );
          console.error(e);
          setTimeout(
            () => batchedDeliver(msgs, latestAckNum, attempts + 1),
            retryTimeoutMs,
          );
        });
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
