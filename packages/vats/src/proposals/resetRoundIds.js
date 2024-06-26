import { E } from '@endo/far';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { makeMarshal } from '@endo/marshal';
import { Fail } from '@agoric/assert';

/**
 * @param {BootstrapPowers & {
 *   consume: { chainStorage: any };
 * }} powers
 * @param {object} options
 * @param {{ tokenName: string }} options.options
 */
export const resetRoundId = async (
  { consume: { chainStorage, chainTimerService } },
  options,
) => {
  const tokenName = options.options;
  const priceFeedStorageNode = await makeStorageNodeChild(
    chainStorage,
    'priceFeed',
  );
  const tokenStorageNode = await makeStorageNodeChild(
    priceFeedStorageNode,
    `${tokenName}-USD_price_feed`,
  );
  const latestRoundStorageNode = await makeStorageNodeChild(
    tokenStorageNode,
    'latestRound',
  );
  const marshalData = makeMarshal(_val => Fail`data only`);

  const now = await E(chainTimerService).getCurrentTimestamp();
  const latestRound = harden({
    roundId: '0',
    startedAt: now,
    startedBy: 'someoneElse',
  });

  const aux = marshalData.toCapData(harden({ latestRound }));

  await E(latestRoundStorageNode).setValue(JSON.stringify(aux));
};

export const getManifestForResetRoundIds = _powers => ({
  manifest: {
    [resetRoundId.name]: {
      consume: { chainStorage: true, chainTimerService: true },
    },
  },
});
