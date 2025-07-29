/**
 * @file flows for USDN (Noble Dollar) yield protocol.
 *
 * Handles cross-chain operations to swap USDC to USDN and lock it in Noble vaults
 * for yield generation. Uses IBC transfers and Noble-specific message types.
 *
 * @see {@link protocolUSDN}
 * @see {@link agoricToNoble}
 * @see {@link nobleToAgoric}
 */
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import {
  MsgLock,
  MsgUnlock,
} from '@agoric/cosmic-proto/noble/dollar/vaults/v1/tx.js';
import { MsgSwap } from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import { AmountMath } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import type { CosmosChainAddress, Denom } from '@agoric/orchestration';
import {
  type ProtocolDetail,
  type TransportDetail,
} from './portfolio.flows.ts';
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
    trace('supply result', result);
  },
  withdraw: async (ctx, amount, dest, claim) => {
    if (claim) {
      throw new Error('claiming USDN is not supported');
    }
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
    trace('withdraw result', result);
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
