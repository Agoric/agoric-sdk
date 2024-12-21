/**
 * @file Terminate v110 zcf-b1-9f877-stkATOM-USD_price_feed-governor.
 */

import { E } from '@endo/far';

/// <reference types="@agoric/vats/src/core/types-ambient"/>

/**
 * @param {BootstrapPowers} powers
 */
export const terminateOriginalStkATOMPriceFeedGovernor = async ({
  consume: { board, governedContractKits },
}) => {
  const { Fail, quote: q } = assert;
  const expectedLabel = 'stkATOM-USD_price_feed';
  const contractInstanceHandle = await E(board).getValue('board052184');
  // @ts-expect-error Property '[tag]' is missing
  const instanceKit = await E(governedContractKits).get(contractInstanceHandle);
  console.log(
    `alleged ${q(expectedLabel)} governor contract instance kit`,
    instanceKit,
  );
  const { label, governorAdminFacet, adminFacet } = instanceKit;
  label === expectedLabel ||
    Fail`unexpected instanceKit label, got ${label} but wanted ${q(expectedLabel)}`;
  (adminFacet && adminFacet !== governorAdminFacet) ||
    Fail`instanceKit adminFacet should have been present and different from governorAdminFacet but was ${adminFacet}`;
  const reason = harden(Error(`core-eval terminating ${label} governor`));
  await E(governorAdminFacet).terminateContract(reason);
  console.log(`terminated ${label} governor`);
};
harden(terminateOriginalStkATOMPriceFeedGovernor);

export const getManifest = () => {
  return {
    manifest: {
      [terminateOriginalStkATOMPriceFeedGovernor.name]: {
        consume: { board: true, governedContractKits: true },
      },
    },
  };
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    sourceSpec:
      '@agoric/builders/scripts/vats/terminate-original-stkATOM-USD-price-feed-governor.js',
    getManifestCall: ['getManifest'],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(
    terminateOriginalStkATOMPriceFeedGovernor.name,
    defaultProposalBuilder,
  );
};
