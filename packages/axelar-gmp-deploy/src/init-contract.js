import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifest, startAxelarGmp } from './start-contract.js';
import { assetInfo } from './static-config.js';
import { getChainConfig } from './get-chain-config.js';
import { parseArgs } from 'node:util';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
/** @typedef {{ net?: string, peer?: string[] }} PeerChainOpts */
/** @type {import('node:util').ParseArgsConfig['options']} */
const options = {
  net: {
    type: 'string',
  },
  peer: { type: 'string', multiple: true },
};

export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) =>
  harden({
    sourceSpec: './start-contract.js',
    getManifestCall: [
      getManifest.name,
      {
        installationRef: publishRef(
          install('../dist/axelar-gmp.contract.bundle.js'),
        ),
        options,
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
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

  await writeCoreEval(startAxelarGmp.name, (utils) =>
    defaultProposalBuilder(utils, opts),
  );
};
