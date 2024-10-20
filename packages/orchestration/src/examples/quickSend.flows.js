import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { mustMatch } from '@agoric/internal';
import { atob } from '@endo/base64';
import { M } from '@endo/patterns';
import { ChainAddressShape } from '../typeGuards.js';
import { AgoricCalc, NobleCalc } from '../utils/address.js';

/**
 * @import {ExecutionContext} from 'ava';
 *
 * @import {Passable} from '@endo/pass-style';
 * @import {Guarded} from '@endo/exo';
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {ChainAddress, OrchestrationAccountI, OrchestrationFlow, Orchestrator, ZcfTools} from '@agoric/orchestration';
 * @import {VTransferIBCEvent} from '@agoric/vats';
 * @import {ResolvedContinuingOfferResult} from '../../src/utils/zoe-tools.js';
 * @import {InvitationMakers} from '@agoric/smart-wallet/src/types.js';
 * @import {QuickSendTerms} from './quickSend.contract.js';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {TypedPattern} from '@agoric/internal';
 * @import {ChainHub} from '../types.js';
 */

const AddressShape = M.string(); // XXX

/**
 * @typedef {{
 *   amount: NatValue;
 *   dest: ChainAddress;
 *   nobleFwd: string;
 * }} CallDetails
 */

/** @type {TypedPattern<CallDetails>} */
const CallDetailsShape = harden({
  amount: M.nat(),
  dest: ChainAddressShape,
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
 *   chainHub: GuestInterface<ChainHub>;
 *   t?: ExecutionContext<{ nextLabel: Function }>; // XXX
 *   makeSettleTap: (accts: QuickSendAccounts) => Guarded<{
 *     receiveUpcall: (event: VTransferIBCEvent) => void;
 *   }>;
 *   makeWatcherCont: (accts: QuickSendAccounts) => {
 *     invitationMakers: InvitationMakers;
 *     actions: Record<string, Function>;
 *   };
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {{}} _offerArgs
 */
export const initAccounts = async (orch, ctx, seat, _offerArgs) => {
  const { log = console.log } = ctx.t || {};

  const agoric = await orch.getChain('agoric');
  const aInfo = await agoric.getVBankAssetInfo();
  for (const a of aInfo) {
    if (a.brand === ctx.terms.brands.USDC) {
      const [baseName, baseDenom] = ['noble', 'uusdc']; // ???
      await orch.getChain(baseName);
      ctx.chainHub.registerAsset(a.denom, {
        baseDenom,
        baseName,
        chainName: 'agoric',
        brand: ctx.terms.brands.USDC,
      });
      break;
    }
  }

  const fundingPool = await agoric.makeAccount();
  const settlement = await agoric.makeAccount();
  const feeAccount = await agoric.makeAccount();
  const accts = harden({ fundingPool, settlement, feeAccount });
  const tap = ctx.makeSettleTap(accts);
  const registration = await settlement.monitorTransfers(tap);

  log('@@@what to do with registration?', registration);

  const cont = ctx.makeWatcherCont(accts);
  /** @type {ResolvedContinuingOfferResult} */
  const watcherFacet = harden({
    publicSubscribers: {
      fundingPool: (await fundingPool.getPublicTopics()).account,
      settlement: (await settlement.getPublicTopics()).account,
      feeAccount: (await feeAccount.getPublicTopics()).account,
    },
    ...cont,
  });

  seat.exit();
  return watcherFacet;
};
harden(initAccounts);

/**
 * @param {Orchestrator} _orch
 * @param {{
 *   terms: QuickSendTerms & StandardTerms;
 *   t?: ExecutionContext<{ nextLabel: Function }>; // XXX
 * }} ctx
 * @param {QuickSendAccounts & Passable} accts
 * @param {unknown} offerArgs
 */
export const handleCCTPCall = async (_orch, ctx, accts, offerArgs) => {
  const { nextLabel: next = () => '#?' } = ctx.t?.context || {};
  const { log = console.log } = ctx.t || {};
  mustMatch(offerArgs, CallDetailsShape);
  const { amount, dest, nobleFwd } = offerArgs;
  log(next(), 'flows.reportCCTPCall', { amount, dest });
  const { makerFee, contractFee } = ctx.terms;
  const { USDC } = ctx.terms.brands;
  const { fundingPool } = accts;

  const fAddr = fundingPool.getAddress().value;
  const vAddr = AgoricCalc.virtualAddressFor(fAddr, dest.value);
  const nfAddr = NobleCalc.fwdAddressFor(vAddr);
  assert.equal(nfAddr, nobleFwd, `for ${vAddr}`);
  const withBrand = make(USDC, amount);
  const advance = subtract(withBrand, add(makerFee, contractFee));
  log('transfer advance', { dest, advance });
  await fundingPool.transfer(dest, advance);
  return `advance ${advance.value} uusdc sent to ${dest.value}`;
};
harden(handleCCTPCall);

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
  const { log = console.log } = ctx?.t || {};
  // TODO: ignore packets from unknown channels
  //   if (event.packet.source_channel !== config.sourceChannel) {
  //     return;
  //   }

  const tx = /** @type {FungibleTokenPacketData} */ (
    JSON.parse(atob(event.packet.data))
  );
  // TODO: only interested in transfers of `remoteDenom`
  //   if (tx.denom !== config.remoteDenom) {
  //     return;
  //   }
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
