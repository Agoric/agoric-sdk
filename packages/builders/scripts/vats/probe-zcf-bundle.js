import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/probeZcfBundle.js',
    getManifestCall: [
      'getManifestForProbeZcfBundleCap',
      {
        zoeRef: publishRef(install('@agoric/vats/src/vat-zoe.js')),
        zcfRef: publishRef(install('@agoric/zoe/src/contractFacet/vatRoot.js')),
        walletRef: publishRef(
          install('@agoric/smart-wallet/src/walletFactory.js'),
        ),
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('probeZcfBundle', defaultProposalBuilder);
};
