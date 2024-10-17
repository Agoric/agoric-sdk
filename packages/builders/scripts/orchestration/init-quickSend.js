// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';
import { mustMatch } from '@agoric/internal';
import { getManifestForQuickSend } from '@agoric/orchestration/src/proposals/start-quickSend.js';
import { M } from '@endo/patterns';
import { parseArgs } from 'node:util';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {QuickSendConfig} from '@agoric/orchestration/src/proposals/start-quickSend.js';
 * @import {TypedPattern} from '@agoric/internal';
 * @import {ParseArgsConfig} from 'node:util';
 */

/** @type {ParseArgsConfig['options']} */
const options = {
  watcher: { type: 'string' },
};
/** @typedef {{ watcher?: string }} QuickSendOpts */

/** @type {TypedPattern<QuickSendConfig>} */
const QuickSendConfigShape = M.splitRecord({ watcherAddress: M.string() });

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }, opts) => {
  opts && mustMatch(opts, QuickSendConfigShape);
  return harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-quickSend.js',
    /** @type {[string, Parameters<typeof getManifestForQuickSend>[1]]} */
    getManifestCall: [
      getManifestForQuickSend.name,
      {
        options: { quickSend: opts },
        installKeys: {
          quickSend: publishRef(
            install('@agoric/orchestration/src/examples/quickSend.contract.js'),
          ),
        },
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  const { scriptArgs } = endowments;

  /** @type {{ values: QuickSendOpts }} */
  const { values: flags } = parseArgs({ args: scriptArgs, options });
  const config = flags.watcher
    ? harden({ watcherAddress: flags.watcher })
    : undefined;
  await writeCoreEval('start-quickSend', utils =>
    defaultProposalBuilder(utils, config),
  );
};
