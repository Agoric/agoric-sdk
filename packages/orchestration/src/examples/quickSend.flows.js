import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { atob } from '@endo/base64';
import { Far } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { AgoricCalc, NobleCalc } from '../utils/address.js';

/**
 * @import {ExecutionContext} from 'ava';
 *
 * @import {Passable} from '@endo/pass-style';
 * @import {Guarded} from '@endo/exo';
 * @import {OrchestrationAccountI, OrchestrationFlow, Orchestrator, ZcfTools} from '@agoric/orchestration';
 * @import {VTransferIBCEvent} from '@agoric/vats';
 * @import {ResolvedContinuingOfferResult} from '../../src/utils/zoe-tools.js';
 * @import {QuickSendTerms} from './quickSend.contract.js';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 */

const AddressShape = M.string(); // XXX

const CallDetailsShape = harden({
  amount: M.nat(),
  dest: AddressShape,
  nobleFwd: AddressShape,
});

const { add, make, subtract } = AmountMath;

/**
 * @typedef {{
 *   settlement: OrchestrationAccountI;
 *   fundingPool: OrchestrationAccountI;
 *   feeAccount: OrchestrationAccountI;
 * }} QuickSendAccounts
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   terms: QuickSendTerms & StandardTerms;
 *   t?: ExecutionContext<{ nextLabel: Function }>; // XXX
 *   makeInvitation: Function; // XXX ZcfTools['makeInvitation'];
 *   makeSettleTap: (
 *     accts: QuickSendAccounts,
 *   ) => Guarded<{ receiveUpcall: (event: VTransferIBCEvent) => void }>;
 * }} ctx
 * @param {ZCFSeat} _seat
 * @param {{}} _offerArgs
 */
export const initAccounts = async (orch, ctx, _seat, _offerArgs) => {
  const { nextLabel: next = () => '#?' } = ctx.t?.context || {};
  const { log = console.log } = ctx.t || {};
  const { makerFee, contractFee } = ctx.terms;
  const { USDC } = ctx.terms.brands;

  const agoric = await orch.getChain('agoric');

  const fundingPool = await agoric.makeAccount();
  const settlement = await agoric.makeAccount();
  const feeAccount = await agoric.makeAccount();
  const accts = harden({ fundingPool, settlement, feeAccount });
  const registration = await ctx.makeSettleTap(accts);

  log('@@@what to do with registration?', registration);

  /** @type {OfferHandler} */
  const handleCCTPCall = Far('Handler', {
    handle: async (_s, offerArgs) => {
      mustMatch(offerArgs, CallDetailsShape);
      const { amount, dest, nobleFwd } = offerArgs;
      log(next(), 'contract.reportCCTPCall', { amount, dest });
      assert.equal(
        NobleCalc.fwdAddressFor(
          AgoricCalc.virtualAddressFor(fundingPool.getAddress(), dest),
        ),
        nobleFwd,
      );
      const withBrand = make(USDC, amount);
      const advance = subtract(withBrand, add(makerFee, contractFee));
      await fundingPool.transfer(dest, advance);
    },
  });

  /** @type {ResolvedContinuingOfferResult} */
  const watcherFacet = harden({
    publicSubscribers: {
      fundingPool: (await fundingPool.getPublicTopics()).account,
      settlement: (await settlement.getPublicTopics()).account,
      feeAccount: (await feeAccount.getPublicTopics()).account,
    },
    invitationMakers: Far('WatcherInvitationMakers', {
      ReportCCTPCall: () =>
        ctx.makeInvitation(handleCCTPCall, 'reportCCTPCall'),
    }),
    // TODO: skip continuing invitation gymnastics
    actions: { handleCCTPCall },
  });

  return watcherFacet;
};
harden(initAccounts);

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   terms: QuickSendTerms & StandardTerms;
 *   t?: ExecutionContext<{ nextLabel: Function }>; // XXX
 * }} ctx
 * @param {QuickSendAccounts & Passable} acct
 * @param {VTransferIBCEvent & Passable} event
 * @returns {Promise<void>}
 */
export const settle = async (orch, ctx, acct, event) => {
  const config = {}; // TODO
  const { log = console.log } = ctx?.t || {};
  // ignore packets from unknown channels
  if (event.packet.source_channel !== config.sourceChannel) {
    return;
  }

  const tx = /** @type {FungibleTokenPacketData} */ (
    JSON.parse(atob(event.packet.data))
  );
  // only interested in transfers of `remoteDenom`
  if (tx.denom !== config.remoteDenom) {
    return;
  }
  const { contractFee } = ctx.terms;
  const { USDC } = ctx.terms.brands;
  const { settlement, fundingPool, feeAccount } = acct;
  const { nextLabel: next = () => '#?' } = ctx.t?.context || {};
  const amount = make(USDC, BigInt(tx.amount));
  log(next(), 'tap onReceive', { amount });
  // XXX partial failure?
  await Promise.all([
    settlement.send(fundingPool.getAddress(), subtract(amount, contractFee)),
    settlement.send(feeAccount.getAddress(), contractFee),
  ]);
};
harden(settle);
