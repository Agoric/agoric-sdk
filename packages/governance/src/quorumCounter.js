// @ts-check

import { Far } from '@endo/marshal';

export const makeQuorumCounter = quorumThreshold => {
  const check = stats => {
    const votes = stats.results.reduce(
      (runningTotal, { total }) => runningTotal + total,
      0n,
    );
    return votes >= quorumThreshold;
  };
  /** @type {QuorumCounter} */
  return makeExo(
    'checker',
    M.interface('checker', {}, { defaultGuards: 'passable' }),
    { check },
  );
};
