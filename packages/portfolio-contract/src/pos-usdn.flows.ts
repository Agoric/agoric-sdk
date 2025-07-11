/**
 * @file flows for USDN (Noble Dollar) yield protocol.
 *
 * Handles cross-chain operations to swap USDC to USDN and lock it in Noble vaults
 * for yield generation. Uses IBC transfers and Noble-specific message types.
 *
 * @see {@link changeUSDCPosition}
 */
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import {
  MsgLock,
  MsgUnlock,
} from '@agoric/cosmic-proto/noble/dollar/vaults/v1/tx.js';
import { MsgSwap } from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import { AmountMath, type Amount, type NatAmount } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import type {
  CosmosChainAddress,
  Denom,
  DenomAmount,
  Orchestrator,
} from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZCFSeat } from '@agoric/zoe';
import type { GuestInterface } from '../../async-flow/src/types.ts';
import type { AccountInfoFor, PortfolioKit } from './portfolio.exo.ts';
import {
  provideCosmosAccount,
  trackFlow,
  type LocalAccount,
  type NobleAccount,
  type PortfolioInstanceContext,
  type ProtocolDetail,
  type TransportDetail,
} from './portfolio.flows.ts';
import type { Position } from './pos.exo.ts';
import type { OpenPortfolioGive } from './type-guards.ts';
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
    vault = undefined as number | undefined,
    usdnOut = undefined as bigint | undefined,
  } = {},
) => {
  const msgSwap = MsgSwap.fromPartial({
    signer: nobleAddr.value,
    amount: { denom, amount: `${usdcIn}` },
    routes: [{ poolId, denomTo }],
    min: { denom: denomTo, amount: `${usdnOut || usdcIn}` },
  });
  if (vault === undefined) {
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

export const makeUnlockSwapMessages = (
  nobleAddr: CosmosChainAddress,
  usdcOut: bigint,
  {
    poolId = 0n,
    denom = 'uusdn',
    denomTo = 'uusdc',
    vault = 1, // VaultType.STAKED
    usdnOut = undefined as bigint | undefined,
  } = {},
) => {
  // MsgSwap (uusdn → uusdc)
  const msgSwap = MsgSwap.fromPartial({
    signer: nobleAddr.value,
    amount: { denom, amount: `${usdnOut || usdcOut}` },
    routes: [{ poolId, denomTo }],
    min: { denom: denomTo, amount: `${usdnOut || usdcOut}` },
  });
  if (usdnOut === undefined) {
    const protoMessages = [Any.toJSON(MsgSwap.toProtoMsg(msgSwap))];
    return { msgSwap, protoMessages };
  }
  const msgUnlock = MsgUnlock.fromPartial({
    signer: nobleAddr.value,
    vault,
    amount: `${usdnOut}`,
  });

  const protoMessages = [
    Any.toJSON(MsgUnlock.toProtoMsg(msgUnlock)),
    Any.toJSON(MsgSwap.toProtoMsg(msgSwap)),
  ];

  return { msgUnlock, msgSwap, protoMessages };
};

export const protocolUSDN = {
  protocol: 'USDN',
  chains: ['noble'],
  supply: async (ctx, amount, src) => {
    const { usdnOut, vault } = ctx;
    const { ica } = src;
    const nobleAddr = ica.getAddress();

    const { msgSwap, msgLock, protoMessages } = makeSwapLockMessages(
      nobleAddr,
      amount.value,
      { usdnOut, vault },
    );

    trace('executing', [msgSwap, msgLock].filter(Boolean));
    const result = await ica.executeEncodedTx(protoMessages);
    trace('XXX: decode Swap, Lock result; detect errors', result);
  },
  withdraw: async (ctx, amount, dest) => {
    const { usdnOut } = ctx;
    const { ica } = dest;
    const address = ica.getAddress();
    const { msgUnlock, msgSwap, protoMessages } = makeUnlockSwapMessages(
      address,
      amount.value,
      { usdnOut },
    );
    trace('executing', [msgUnlock, msgSwap].filter(Boolean));
    const result = await ica.executeEncodedTx(protoMessages);
    trace('XXX: decode Swap, Lock result; detect errors', result);
  },
} as const satisfies ProtocolDetail<
  'USDN',
  'noble',
  { usdnOut?: NatValue; vault?: number }
>;
harden(protocolUSDN);

export const agoricToNoble = {
  how: 'IBC to Noble',
  connections: [{ src: 'agoric', dest: 'noble' }],
  apply: async (ctx, amount, src, dest) => {
    const { denom } = ctx.usdc;
    const denomAmount = { value: amount.value, denom };
    await src.lca.transfer(dest.ica.getAddress(), denomAmount);
  },
  recover: async (ctx, amount, src, dest) => {
    const nobleAmount = { value: amount.value, denom: 'uusdc' };
    await dest.ica.transfer(src.lca.getAddress(), nobleAmount);
  },
} as const satisfies TransportDetail<
  'IBC to Noble',
  'agoric',
  'noble',
  { usdc: { denom: Denom } }
>;
harden(agoricToNoble);

export const nobleToAgoric = {
  how: 'IBC from Noble',
  connections: [{ src: 'noble', dest: 'agoric' }],
  apply: async (_ctx, amount, src, dest) => {
    const nobleAmount = { value: amount.value, denom: 'uusdc' };
    await src.ica.transfer(dest.lca.getAddress(), nobleAmount);
  },
  recover: async (ctx, amount, src, dest) => {
    const { denom } = ctx.usdc;
    const denomAmount = { value: amount.value, denom };
    await dest.lca.transfer(src.ica.getAddress(), denomAmount);
  },
} as const satisfies TransportDetail<
  'IBC from Noble',
  'noble',
  'agoric',
  { usdc: { denom: Denom } }
>;
harden(agoricToNoble);

export const addToUSDNPosition = async (
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  lca: LocalAccount,
  ica: NobleAccount,
  pos: Position,
  reporter: GuestInterface<PortfolioKit['reporter']>,
  { USDN, NobleFees }: { USDN: Amount<'nat'>; NobleFees?: Amount<'nat'> },
  usdnOut: bigint = USDN.value,
) => {
  const amounts = harden({ USDN, ...(NobleFees ? { NobleFees } : {}) });
  const { denom } = ctx.usdc;
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
        trace('XXX: decode Swap, Lock result; detect errors', result);
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
  kit: GuestInterface<PortfolioKit>,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
) => {
  assert('USDN' in give && give.USDN); // XXX get rid of this using trackFlow
  const { USDN, NobleFees } = give;
  const g = harden({ USDN, NobleFees });
  const { usdnOut } = offerArgs;
  const { lca } = await provideCosmosAccount(orch, 'agoric', kit);
  const { ica } = await provideCosmosAccount(orch, 'noble', kit);
  const accountId = coerceAccountId(ica.getAddress());
  const pos = kit.manager.providePosition('USDN', 'USDN', accountId);
  await addToUSDNPosition(ctx, seat, lca, ica, pos, kit.reporter, g, usdnOut);
};
