import { BrandShape } from '@agoric/ertp/src/typeGuards.js';
import { M } from '@endo/patterns';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './quickSend.flows.js';

/**
 * @import {ExecutionContext} from 'ava'; // XXX
 *
 * @import {CopyRecord} from '@endo/pass-style';
 * @import {OrchestrationPowers, OrchestrationTools} from '../utils/start-helper.js';
 * @import {Zone} from '@agoric/zone';
 * @import {VTransferIBCEvent} from '@agoric/vats';
 * @import {QuickSendAccounts} from './quickSend.flows.js';
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
 * @param {OrchestrationTools & {
 *   t?: ExecutionContext<{ nextLabel: Function }>;
 * }} tools
 */
export const contract = async (zcf, privateArgs, zone, tools) => {
  const { storageNode } = privateArgs;
  const { t } = tools;
  const terms = zcf.getTerms();

  const makeSettleTap = zone.exoClass(
    'SettleTap',
    M.interface('SettleTap', {
      receiveUpcall: M.call(M.record()).returns(M.undefined()),
    }),
    /** @param {QuickSendAccounts & CopyRecord} accts */
    accts => accts,
    {
      /** @param {VTransferIBCEvent & CopyRecord} event */
      receiveUpcall(event) {
        const accts = this.state;
        // eslint-disable-next-line no-use-before-define -- see orchestrate below
        settle(accts, harden(event));
      },
    },
  );

  const { makeInvitation } = tools.zcfTools;
  const initAccounts = tools.orchestrate(
    'initAccounts',
    { terms, makeSettleTap, makeInvitation, t },
    flows.initAccounts,
  );

  const settle = tools.orchestrate('settle', { terms, t }, flows.settle);

  const creatorFacet = zone.exo('QuickSend Creator', undefined, {
    // TODO: continuing invitation pattern
    getWatcherInvitation: () =>
      zcf.makeInvitation(initAccounts, 'initAccounts'),
  });

  return harden({ creatorFacet });
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);

/** @typedef {typeof start} QuickSendContractFn */
