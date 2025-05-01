import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifest, startPayments } from '../src/proposals/start-payments.js';
import { parseChainHubOpts } from './helpers.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) =>
  harden({
    sourceSpec: '../src/proposals/start-payments.js',
    getManifestCall: [
      getManifest.name,
      {
        installationRef: publishRef(
          install('@aglocal/payments-contract/dist/my.contract.bundle.js'),
        ),
        options,
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  const opts = parseChainHubOpts(scriptArgs);
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startPayments.name, utils =>
    defaultProposalBuilder(utils, opts),
  );
};
