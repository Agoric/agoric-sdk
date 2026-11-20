// @ts-check
import { pipeline } from 'node:stream/promises';
import BufferLineTransform from '@agoric/internal/src/node/buffer-line-transform.js';

/**
 * @import { Readable } from 'node:stream';
 * @param {Readable} input
 * @param {(line: string) => void} acceptLine
 * @param {AbortSignal} signal
 */
export const makeReadlineLoop = async (input, acceptLine, signal) => {
  await null;
  if (signal.aborted) {
    input.destroy();
    return;
  }
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
  /** @type {{ reason: unknown } | undefined} */
  let lineFailure;
  try {
    await pipeline(
      input,
      new BufferLineTransform(),
      async lines => {
        for await (const line of lines) {
          if (signal.aborted) break;
          let end = line.length;
          if (line[end - 1] === 10) end -= 1;
          if (line[end - 1] === 13) end -= 1;
          try {
            acceptLine(decoder.decode(line.subarray(0, end)));
          } catch (reason) {
            // Pipeline teardown may surface its own AbortError first. Retain
            // the decoding/dispatch failure that initiated that teardown.
            lineFailure = { reason };
            throw reason;
          }
        }
      },
      { signal },
    );
  } catch (error) {
    if (lineFailure) throw lineFailure.reason;
    // Explicit cancellation completes the loop; input/dispatch failures reject.
    if (signal.aborted && error?.code === 'ABORT_ERR') return;
    throw error;
  }
};
