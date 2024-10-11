import { BrandShape } from '@agoric/ertp/src/typeGuards.js';
import { M } from '@endo/patterns';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './quickSend.flows.js';

/**
 * @import {OrchestrationPowers, OrchestrationTools} from '../utils/start-helper.js';
 * @import {Zone} from '@agoric/zone';
 */

const NatAmountShape = { brand: BrandShape, value: M.nat() };
export const meta = {
  customTermsShape: {
    contractFee: NatAmountShape,
    makerFee: NatAmountShape,
  },
};
harden(meta);

/**
 * @typedef {{ makerFee: Amount<'nat'>; contractFee: Amount<'nat'> }} QuickSendTerms
 * @param {ZCF<QuickSendTerms>} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools & { t: any }} tools
 */
export const contract = async (zcf, privateArgs, zone, tools) => {
  const { storageNode } = privateArgs;
  const { t } = tools;
  const terms = zcf.getTerms();

  const { initAccounts } = tools.orchestrateAll(flows, {
    storageNode, // TODO: storage node per init?
    terms,
    makeInvitation: tools.zcfTools.makeInvitation,
    t,
  });

  const creatorFacet = harden({
    // TODO: continuing invitation pattern
    getWatcherInvitation: () =>
      zcf.makeInvitation(initAccounts, 'initAccounts'),
  });

  return harden({
    publicFacet: {},
    creatorFacet,
  });
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
