import { makeHelpers } from '@agoric/deploy-script-support';
import { priceFeedProposalBuilder } from './priceFeedSupport.js';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

const OPTIONS = {
  AGORIC_INSTANCE_NAME: 'stkATOM-USD price feed',
  IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'stkATOM'],
  OUT_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'USD'],
};

/**
 * @type {CoreEvalBuilder}
 */
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  return priceFeedProposalBuilder({ publishRef, install }, OPTIONS);
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('stkATOMPriceFeed', defaultProposalBuilder);
};
