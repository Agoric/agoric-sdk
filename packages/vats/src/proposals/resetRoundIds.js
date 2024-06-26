import { E } from '@endo/far';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { makeMarshal } from '@endo/marshal';
import { Fail } from '@agoric/assert';

/**
 * @param {BootstrapPowers & {
 *   consume: { chainStorage: any };
 * }} powers
 */
export const resetRoundId = async ({
  consume: { chainStorage, chainTimerService },
}) => {
  const TOKENS = ['stTIA', 'stkATOM'];

  const priceFeedStorageNode = await makeStorageNodeChild(
    chainStorage,
    'priceFeed',
  );
  for (const token of TOKENS) {
    const name = `${token}-USD_price_feed`;
    const tokenStorageNode = await makeStorageNodeChild(
      priceFeedStorageNode,
      name,
    );
    const marshalData = makeMarshal(_val => Fail`data only`);

    const now = await E(chainTimerService).getCurrentTimestamp();
    const latestRound = harden({
      roundId: '0',
      startedAt: now,
      startedBy: 'someoneElse',
    });

    const aux = marshalData.toCapData(harden({ latestRound }));

    await E(tokenStorageNode).setValue(JSON.stringify(aux));
  }
};

export const getManifestForResetRoundIds = _powers => ({
  manifest: {
    [resetRoundId.name]: {
      consume: { chainStorage: true, chainTimerService: true },
    },
  },
});
