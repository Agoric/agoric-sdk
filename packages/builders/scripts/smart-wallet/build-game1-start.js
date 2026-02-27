/**
 * @file Proposal Builder: Start Game with non-vbank Place NFT asset
 *
 * Usage:
 *   agoric run build-game1-start.js
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForGame1 } from '@agoric/smart-wallet/tools/start-game1-proposal.js';
import { buildBundlePath } from '../lib/build-bundle.js';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
const game1ProposalBuilder = async ({ publishRef, install }) => {
  const game1Path = await buildBundlePath(
    import.meta.url,
    '@agoric/smart-wallet/tools/gameAssetContract.js',
    'game1',
  );
  return harden({
    sourceSpec: '@agoric/smart-wallet/tools/start-game1-proposal.js',
    getManifestCall: [
      getManifestForGame1.name,
      {
        game1Ref: publishRef(
          install('@agoric/smart-wallet/tools/gameAssetContract.js', game1Path, {
            persist: true,
          }),
        ),
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('start-game1', game1ProposalBuilder);
};
