/* global harden */
/// <reference types="ses" />
import { makeHelpers } from '@agoric/deploy-script-support';
import { parseArgs } from 'node:util';

// based on register-interchain-bank-assets.builder.js

/**
 * @import {ParseArgsConfig} from 'node:util';
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/**
 * @param {*} _
 * @param {*} options
 * @satisfies {CoreEvalBuilder}
 */
export const defaultProposalBuilder = async (_, options) => {
  return harden({
    sourceSpec: './access-token-setup.core.js',
    getManifestCall: ['getManifestCall', options],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;

  const {
    values: { qty: qtyNumeral, beneficiary },
  } = parseArgs({
    args: scriptArgs,
    options: {
      qty: { type: 'string', default: '50000000' },
      beneficiary: {
        type: 'string',
        default: 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
      },
    },
  });

  const opts = harden({ qty: Number(qtyNumeral), beneficiary });

  console.log('CONFIG:', opts);
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('eval-access-token-setup', utils =>
    defaultProposalBuilder(utils, opts),
  );
};
