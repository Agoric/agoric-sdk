import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { Stable } from '@agoric/internal/src/tokens.js';
import { E } from '@endo/far';

const trace = makeTracer('StartCrowdfunding', true);

export const CONTRACT_NAME = 'crowdfunding';

/**
 * @param {import('@agoric/inter-protocol/src/proposals/econ-behaviors').EconomyBootstrapPowers} powers
 * @param {object} config
 * @param {object} [config.options]
 */
export const startCrowdfunding = async (
  {
    consume: { board, chainStorage, diagnostics, zoe },
    produce: { crowdfundingKit },
    installation: {
      consume: { crowdfunding: crowdfundingInstallation },
    },
    instance: {
      produce: { crowdfunding: crowdfundingInstance },
    },
    brand: {
      consume: { [Stable.symbol]: feeBrand },
    },
  },
  { options },
) => {
  trace('startCrowdfunding');

  const storageNode = await makeStorageNodeChild(chainStorage, CONTRACT_NAME);

  // no need to publish to the board
  const marshaller = await E(board).getReadonlyMarshaller();

  const privateArgs = {
    storageNode,
    marshaller,
  };
  const startResult = await E(zoe).startInstance(
    crowdfundingInstallation,
    {}, // IssuerKeyword record
    { feeBrand }, // terms
    privateArgs,
    'crowdfunding',
  );
  await E(diagnostics).savePrivateArgs(startResult.instance, privateArgs);

  crowdfundingInstance.resolve(startResult.instance);
};
harden(startCrowdfunding);

export const getManifestForCrowdfunding = (
  { restoreRef },
  { crowdfundingRef },
) => ({
  manifest: {
    [startCrowdfunding.name]: {
      consume: {
        board: true,
        chainStorage: true,
        diagnostics: true,
        zoe: true,
      },
      produce: {
        crowdfundingKit: true,
      },
      installation: {
        consume: { crowdfunding: true },
      },
      instance: {
        produce: { crowdfunding: 'crowdfunding' },
      },
      brand: {
        consume: { [Stable.symbol]: 'zoe' },
      },
    },
  },
  installations: {
    [CONTRACT_NAME]: restoreRef(crowdfundingRef),
  },
});
