import { makeHelpers } from '@agoric/deploy-script-support';
import { parseArgs } from 'node:util';
import {
  getManifest,
  startAxelarGmp,
} from '@agoric/orchestration/src/proposals/start-axelar-gmp.js';
import { assetInfo } from '@agoric/orchestration/src/utils/axelar-static-config.js';
import { getChainConfig } from './get-chain-config.js';

/** @typedef {{ net?: string, peer?: string[] }} PeerChainOpts */

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) =>
  harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-axelar-gmp.js',
    getManifestCall: [
      getManifest.name,
      {
        installationRef: publishRef(
          install('@agoric/orchestration/dist/axelar-gmp.contract.bundle.js'),
        ),
        options,
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;

  /** @type {import('node:util').ParseArgsConfig['options']} */
  const options = {
    net: {
      type: 'string',
    },
    peer: { type: 'string', multiple: true },
  };

  /** @type {{ values: PeerChainOpts }} */
  const { values: flags } = parseArgs({ args: scriptArgs, options });

  const parseAssetInfo = () => {
    if (typeof assetInfo !== 'string') return undefined;
    return JSON.parse(assetInfo);
  };

  if (!flags.net) throw Error('--peer required');
  if (!flags.peer) throw Error('--net required');

  const chainDetails = await getChainConfig({
    net: flags.net,
    peer: flags.peer,
  });

  const opts = harden({
    chainInfo: chainDetails,
    assetInfo: parseAssetInfo(),
  });

  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval(startAxelarGmp.name, utils =>
    defaultProposalBuilder(utils, opts),
  );
};
