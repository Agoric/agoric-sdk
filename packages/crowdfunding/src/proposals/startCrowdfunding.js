import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { Stable } from '@agoric/internal/src/tokens.js';
import { E } from '@endo/far';
import { publishAgoricBrandsDisplayInfo } from '@agoric/smart-wallet/src/proposals/upgrade-walletFactory-proposal.js';

const trace = makeTracer('StartCrowdfunding', true);

export const CONTRACT_NAME = 'crowdfunding';

/**
 * @param {import('@agoric/inter-protocol/src/proposals/econ-behaviors').EconomyBootstrapPowers} powers
 */
export const startCrowdfunding = async ({
  consume: { board, chainStorage, diagnostics, zoe },
  produce: { crowdfundingKit },
  installation: {
    consume: { crowdfunding: crowdfundingInstallation },
  },
  instance: {
    produce: { crowdfunding: crowdfundingInstance },
  },
  brand: {
    consume: { [Stable.symbol]: feeBrandP },
  },
}) => {
  trace('startCrowdfunding');

  const storageNode = await makeStorageNodeChild(chainStorage, CONTRACT_NAME);

  // no need to publish to the board
  const marshaller = await E(board).getReadonlyMarshaller();

  const privateArgs = {
    storageNode,
    marshaller,
  };
  /**
   * @type {import('@agoric/zoe/src/zoeService/utils.js').StartedInstanceKit<import('@agoric/crowdfunding/src/crowdfunding.contract.js')['start']>}
   */
  const startResult = await E(zoe).startInstance(
    crowdfundingInstallation,
    {}, // IssuerKeyword record
    { feeBrand: await feeBrandP }, // terms
    privateArgs,
    'crowdfunding',
  );
  crowdfundingKit.resolve(startResult);

  await E(diagnostics).savePrivateArgs(startResult.instance, privateArgs);

  crowdfundingInstance.resolve(startResult.instance);
};
harden(startCrowdfunding);

export const getManifestForCrowdfunding = (
  { restoreRef },
  { crowdfundingRef },
) => ({
  manifest: {
    [publishAgoricBrandsDisplayInfo.name]: {
      consume: { agoricNames: true, board: true, chainStorage: true },
    },
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
