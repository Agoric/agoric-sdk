import { BrandShape } from '@agoric/ertp/src/typeGuards.js';
import { M } from '@endo/patterns';
import { withOrchestration } from '@agoric/orchestration';
import * as flows from './quickSend.flows.js';

/**
 * @import {ExecutionContext} from 'ava'; // XXX
 *
 * @import {CopyRecord} from '@endo/pass-style';
 * @import {OrchestrationPowers, OrchestrationTools} from '@agoric/orchestration/src/utils/start-helper.js';
 * @import {Zone} from '@agoric/zone';
 * @import {VTransferIBCEvent} from '@agoric/vats';
 * @import {QuickSendAccounts} from './quickSend.flows.js';
 */

const NatAmountShape = { brand: BrandShape, value: M.nat() };
export const meta = {
  customTermsShape: {
    contractFee: NatAmountShape,
    makerFee: NatAmountShape,
    feeAccountAddress: M.string(),
  },
};
harden(meta);

/**
 * @typedef {{
 *   makerFee: Amount<'nat'>;
 *   contractFee: Amount<'nat'>;
 *   feeAccountAddress: string;
 * }} QuickSendTerms
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
  const { t, chainHub } = tools;

  const terms = zcf.getTerms();
  assert('USDC' in terms.brands, 'no USDC brand');

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
        // eslint-disable-next-line no-use-before-define -- see orchestrate below
        settle({ ...this.state }, harden(event));
      },
    },
  );

  const handleCCTPCall = tools.orchestrate(
    'handleCCTPCall',
    { terms, t },
    flows.handleCCTPCall,
  );

  const ifaceTODO = undefined;
  const makeWatcherCont = zone.exoClassKit(
    'WatcherCont',
    ifaceTODO,
    /** @param {QuickSendAccounts & CopyRecord} accts */
    accts => ({ ...accts }),
    {
      actions: {
        // TODO: skip continuing invitation gymnastics
        handleCCTPCall(offerArgs) {
          return handleCCTPCall({ ...this.state }, offerArgs);
        },
      },
      offerHandler: {
        handle(seat, offerArgs) {
          seat.exit();
          return handleCCTPCall({ ...this.state }, offerArgs);
        },
      },
      invitationMakers: {
        ReportCCTPCall() {
          const { offerHandler } = this.facets;
          return zcf.makeInvitation(offerHandler, 'reportCCTPCall');
        },
      },
    },
  );
  // const makeWatcherCont = accts => makeWatcherContKit(accts).invitationMakers;

  const initAccounts = tools.orchestrate(
    'initAccounts',
    { terms, chainHub, makeSettleTap, makeWatcherCont, t },
    // @ts-expect-error HALP! monster error around ctx
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
