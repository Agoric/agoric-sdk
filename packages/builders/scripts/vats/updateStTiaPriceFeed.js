import { makeHelpers } from '@agoric/deploy-script-support';
import { priceFeedProposalBuilder } from './priceFeedSupport.js';

const OPTIONS = {
  AGORIC_INSTANCE_NAME: 'stTIA-USD price feed',
  IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'stTIA'],
  OUT_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'USD'],
};

/**
 * @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder}
 */
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  return priceFeedProposalBuilder({ publishRef, install }, OPTIONS);
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('stTiaPriceFeed', defaultProposalBuilder);
};
