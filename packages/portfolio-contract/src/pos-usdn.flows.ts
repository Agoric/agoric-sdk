/**
 * @file flows for USDN (Noble Dollar) yield protocol.
 *
 * Handles cross-chain operations to swap USDC to USDN and lock it in Noble vaults
 * for yield generation. Uses IBC transfers and Noble-specific message types.
 *
 * @see {@link changeUSDCPosition}
 */
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { MsgLock } from '@agoric/cosmic-proto/noble/dollar/vaults/v1/tx.js';
import { MsgSwap } from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import { AmountMath, type Amount } from '@agoric/ertp';
import { makeTracer, NonNullish } from '@agoric/internal';
import type {
  CosmosChainAddress,
  DenomAmount,
  Orchestrator,
} from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZCFSeat } from '@agoric/zoe';
import type { GuestInterface } from '../../async-flow/src/types.ts';
import type { PortfolioKit } from './portfolio.exo.ts';
import {
  provideAccountInfo,
  trackFlow,
  type LocalAccount,
  type NobleAccount,
  type PortfolioInstanceContext,
} from './portfolio.flows.ts';
import type { OpenPortfolioGive } from './type-guards.ts';
import type { USDNPosition } from './pos-usdn.exo.ts';
// XXX: import { VaultType } from '@agoric/cosmic-proto/dist/codegen/noble/dollar/vaults/v1/vaults';

const { add } = AmountMath;
const trace = makeTracer('USDNF');

export const makeSwapLockMessages = (
  nobleAddr: CosmosChainAddress,
  usdcIn: bigint,
  {
    poolId = 0n,
    denom = 'uusdc',
    denomTo = 'uusdn',
    vault = 1, // VaultType.STAKED,
    usdnOut = undefined as bigint | undefined,
  } = {},
) => {
  const msgSwap = MsgSwap.fromPartial({
    signer: nobleAddr.value,
    amount: { denom, amount: `${usdcIn}` },
    routes: [{ poolId, denomTo }],
    min: { denom: denomTo, amount: `${usdnOut || usdcIn}` },
  });
  if (!usdnOut) {
    const protoMessages = [Any.toJSON(MsgSwap.toProtoMsg(msgSwap))];
    return { msgSwap, protoMessages };
  }
  const msgLock = MsgLock.fromPartial({
    signer: nobleAddr.value,
    vault,
    amount: `${usdnOut}`,
  });
  const protoMessages = [
    Any.toJSON(MsgSwap.toProtoMsg(msgSwap)),
    Any.toJSON(MsgLock.toProtoMsg(msgLock)),
  ];
  return { msgSwap, msgLock, protoMessages };
};

export const addToUSDNPosition = async (
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  lca: LocalAccount,
  ica: NobleAccount,
  pos: USDNPosition,
  reporter: GuestInterface<PortfolioKit['reporter']>,
  { USDN, NobleFees }: { USDN: Amount<'nat'>; NobleFees?: Amount<'nat'> },
  usdnOut: bigint = USDN.value,
) => {
  const amounts = harden({ USDN, ...(NobleFees ? { NobleFees } : {}) });
  const denom = NonNullish(ctx.chainHubTools.getDenom(USDN.brand));
  const volume: DenomAmount = { denom, value: USDN.value };
  const withFees = NobleFees ? add(USDN, NobleFees) : USDN;

  const nobleAddr = ica.getAddress();
  await trackFlow(reporter, [
    {
      how: 'localTransfer',
      src: { seat, keyword: 'USDN' },
      dest: { account: lca },
      amount: withFees,
      apply: async () => {
        await ctx.zoeTools.localTransfer(seat, lca, amounts);
      },
      recover: async () => {
        await ctx.zoeTools.withdrawToSeat(lca, seat, amounts);
      },
    },
    {
      how: 'IBC transfer',
      src: { account: lca },
      dest: { account: ica },
      amount: withFees,
      apply: async () => {
        await lca.transfer(nobleAddr, volume);
      },
      recover: async () => {
        const nobleAmount = { ...volume, denom: 'uusdc' };
        await ica.transfer(lca.getAddress(), nobleAmount);
      },
    },
    {
      how: 'Swap, Lock',
      amount: USDN,
      src: { account: ica },
      dest: { pos },
      apply: async () => {
        // NOTE: proposalShape guarantees that amount.brand is USDC
        const { msgSwap, msgLock, protoMessages } = makeSwapLockMessages(
          nobleAddr,
          USDN.value,
          { usdnOut },
        );

        trace('executing', [msgSwap, msgLock].filter(Boolean));
        const result = await ica.executeEncodedTx(protoMessages);
        trace('TODO: decode Swap, Lock result; detect errors', result);
      },
      // XXX consider putting withdaw here
      recover: async () => {},
    },
  ]);
}; // XXX: push down to Orchestration API in NobleMethods, in due course

export const changeUSDCPosition = async (
  give: OpenPortfolioGive,
  offerArgs: { usdnOut?: NatValue },
  orch: Orchestrator,
  kit,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
) => {
  assert('USDN' in give && give.USDN); // XXX get rid of this using trackFlow
  const { USDN, NobleFees } = give;
  const g = harden({ USDN, NobleFees });
  const { usdnOut } = offerArgs;
  const { lca } = await provideAccountInfo(orch, 'agoric', kit);
  const { ica } = await provideAccountInfo(orch, 'noble', kit);
  const accountId = coerceAccountId(ica.getAddress());
  const pos = kit.manager.provideUSDNPosition(accountId);
  await addToUSDNPosition(ctx, seat, lca, ica, pos, kit.reporter, g, usdnOut);
};
