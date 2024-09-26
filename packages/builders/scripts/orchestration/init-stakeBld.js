// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-stakeBld.js',
    getManifestCall: [
      'getManifestForStakeBld',
      {
        installKeys: {
          stakeBld: publishRef(
            install('@agoric/orchestration/src/examples/stake-bld.contract.js'),
          ),
        },
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('start-stakeBld', defaultProposalBuilder);
};
