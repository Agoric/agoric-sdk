/**
 * @file Proposal Builder: Start Game with non-vbank Place NFT asset
 *
 * Usage:
 *   agoric run build-game1-start.js
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForGame1 } from '@agoric/smart-wallet/test/start-game1-proposal.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
const game1ProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    sourceSpec: '@agoric/smart-wallet/test/start-game1-proposal.js',
    getManifestCall: [
      getManifestForGame1.name,
      {
        game1Ref: publishRef(
          install(
            '@agoric/smart-wallet/test/gameAssetContract.js',
            '../bundles/bundle-game1.js',
            { persist: true },
          ),
        ),
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('start-game1', game1ProposalBuilder);
};
