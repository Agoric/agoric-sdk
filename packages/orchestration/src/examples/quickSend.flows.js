/**
 * @import {ExecutionContext} from 'ava';
 *
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {OrchestrationFlow, Orchestrator, ZcfTools} from '@agoric/orchestration';
 * @import {VTransferIBCEvent} from '@agoric/vats';
 * @import {ResolvedContinuingOfferResult} from '../../src/utils/zoe-tools.js';
 * @import {QuickSendTerms} from './quickSend.contract.js';
 */

import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { BrandShape } from '@agoric/ertp/src/typeGuards.js';
import { mustMatch, M } from '@endo/patterns';
import { AgoricCalc, NobleCalc } from '../utils/address.js';

const NatAmountShape = { brand: BrandShape, value: M.nat() };
const AddressShape = M.string(); // XXX

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   terms: QuickSendTerms & StandardTerms;
 *   t: ExecutionContext<{ nextLabel: Function }>; // XXX
 *   makeInvitation: Function; // XXX ZcfTools['makeInvitation']
 * }} ctx
 * @param {ZCFSeat} _seat
 * @param {{}} _offerArgs
 */
export const initAccounts = async (orch, ctx, _seat, _offerArgs) => {
  const { nextLabel: next } = ctx.t.context;
  const { makerFee, contractFee } = ctx.terms;
  const { USDC } = ctx.terms.brands;

  const agoric = await orch.getChain('agoric');

  const fundingPool = await agoric.makeAccount();
  const settlement = await agoric.makeAccount();
  const feeAccount = await agoric.makeAccount();

  const CallDetailsShape = harden({
    amount: M.nat(),
    dest: AddressShape,
    nobleFwd: AddressShape,
  });

  const { add, make, subtract } = AmountMath;

  const registration = await settlement.monitorTransfers(
    harden({
      /**
       * @param {VTransferIBCEvent} event
       * @returns {Promise<void>}
       */
      async receiveUpcall(event) {
        // TODO: real encoding / decoding of packet
        const { amount: inUSDC } = JSON.parse(event.packet.data);
        const amount = make(USDC, BigInt(inUSDC));
        ctx.t.log(next(), 'tap onReceive', { amount });
        // XXX partial failure?
        await Promise.all([
          settlement.send(
            fundingPool.getAddress(),
            subtract(amount, contractFee),
          ),
          settlement.send(feeAccount.getAddress(), contractFee),
        ]);
      },
    }),
  );
  ctx.t.log('@@@what to do with registration?', registration);

  const handleCCTPCall = async (_s, offerArgs) => {
    mustMatch(offerArgs, CallDetailsShape);
    const { amount, dest, nobleFwd } = offerArgs;
    ctx.t.log(next(), 'contract.reportCCTPCall', { amount, dest });
    assert.equal(
      NobleCalc.fwdAddressFor(
        AgoricCalc.virtualAddressFor(fundingPool.getAddress(), dest),
      ),
      nobleFwd,
    );
    const withBrand = make(USDC, amount);
    const advance = subtract(withBrand, add(makerFee, contractFee));
    await fundingPool.transfer(dest, advance);
  };

  /** @type {ResolvedContinuingOfferResult} */
  const watcherFacet = harden({
    publicSubscribers: {
      fundingPool: (await fundingPool.getPublicTopics()).account,
      settlement: (await settlement.getPublicTopics()).account,
      feeAccount: (await feeAccount.getPublicTopics()).account,
    },
    invitationMakers: {
      ReportCCTPCall: () =>
        ctx.makeInvitation(handleCCTPCall, 'reportCCTPCall'),
    },
    // TODO: skip continuing invitation gymnastics
    actions: { handleCCTPCall },
  });

  return watcherFacet;
};
harden(initAccounts);
