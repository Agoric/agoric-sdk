import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifest, startOther } from '../src/proposals/start-other.js';
import { parseChainHubOpts } from './helpers.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) =>
  harden({
    sourceSpec: '../src/proposals/start-other.js',
    getManifestCall: [
      getManifest.name,
      {
        installationRef: publishRef(
          install('@aglocal/payments-contract/dist/other.contract.bundle.js'),
        ),
        options,
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  await null;
  const { scriptArgs } = endowments;

  let chainInfoImport;
  switch (scriptArgs && scriptArgs[0]) {
    case 'devnet': {
      chainInfoImport =
        '@agoric/orchestration/src/fetched-chain-info.devnet.js';
      break;
    }
    case 'main': {
      chainInfoImport = '@agoric/orchestration/src/fetched-chain-info.js';
      break;
    }
    default: {
      break;
    }
  }

  let args = Array.isArray(scriptArgs) ? scriptArgs : [];
  if (chainInfoImport) {
    const { default: chainInfo } = await import(chainInfoImport);
    args = ['--chainInfo', JSON.stringify(chainInfo), ...args.slice(1)];
  }

  const opts = parseChainHubOpts(args);
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startOther.name, utils =>
    defaultProposalBuilder(utils, opts),
  );
};
