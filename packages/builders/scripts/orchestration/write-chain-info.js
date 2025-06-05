import { makeHelpers } from '@agoric/deploy-script-support';

console.warn('DEPRECATED in favor of chain-info.build.js');

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    sourceSpec: '@agoric/orchestration/src/proposals/init-chain-info.js',
    getManifestCall: ['getManifestForChainInfo'],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('gov-orchestration', defaultProposalBuilder);
};
