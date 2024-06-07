import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async _powers =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/localchain-test.js',
    getManifestCall: [
      'getManifestForLocalChainTest',
      {
        testResultPath: 'test.localchain',
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('test-localchain', defaultProposalBuilder);
};
