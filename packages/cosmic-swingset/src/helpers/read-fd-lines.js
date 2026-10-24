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
          acceptLine(line.subarray(0, end).toString('utf8'));
        }
      },
      { signal },
    );
  } catch (error) {
    // Explicit cancellation completes the loop; input/dispatch failures reject.
    if (signal.aborted && error?.code === 'ABORT_ERR') return;
    throw error;
  }
};
