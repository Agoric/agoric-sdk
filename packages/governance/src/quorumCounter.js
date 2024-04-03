// @ts-check

import { Far } from '@endo/marshal';

/**
 * @import {QuorumCounter} from './types.js';
 */

export const makeQuorumCounter = quorumThreshold => {
  const check = stats => {
    const votes = stats.results.reduce(
      (runningTotal, { total }) => runningTotal + total,
      0n,
    );
    return votes >= quorumThreshold;
  };
  /** @type {QuorumCounter} */
  return Far('checker', { check });
};
