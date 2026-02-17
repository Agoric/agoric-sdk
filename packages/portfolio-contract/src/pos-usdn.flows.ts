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
import { CodecHelper } from '@agoric/cosmic-proto';
import { Any as AnyType } from '@agoric/cosmic-proto/google/protobuf/any.js';
import {
  MsgLock as MsgLockType,
  MsgUnlock as MsgUnlockType,
} from '@agoric/cosmic-proto/noble/dollar/vaults/v1/tx.js';
import { VaultType } from '@agoric/cosmic-proto/noble/dollar/vaults/v1/vaults.js';
import { MsgSwap as MsgSwapType } from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import { type NatValue } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { type CosmosChainAddress, type Denom } from '@agoric/orchestration';
import {
  type ProtocolDetail,
  type TransportDetail,
} from './portfolio.flows.ts';

const Any = CodecHelper(AnyType);
const MsgLock = CodecHelper(MsgLockType);
const MsgUnlock = CodecHelper(MsgUnlockType);
const MsgSwap = CodecHelper(MsgSwapType);

const trace = makeTracer('USDNF');

/**
 * Build Noble `MsgSwap` and optional `MsgLock` payloads for a USDN supply step.
 *
 * If `vault` is omitted, returns only the swap message (USDC -> USDN).
 * If `vault` is set, returns both swap and lock messages to stake the swapped USDN.
 *
 * @param nobleAddr - Noble account that signs/executes the messages.
 * @param usdcIn - Input USDC amount in `uusdc`.
 * @param opts - Optional swap/lock tuning parameters.
 */
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
  const usdnAmount = usdnOut ?? usdcIn;
  const msgSwap = MsgSwap.fromPartial({
    signer: nobleAddr.value,
    amount: { denom, amount: `${usdcIn}` },
    routes: [{ poolId, denomTo }],
    min: { denom: denomTo, amount: `${usdnAmount}` },
  });
  if (vault === undefined) {
    const protoMessages = [Any.toJSON(MsgSwap.toProtoMsg(msgSwap))];
    return { msgSwap, protoMessages };
  }
  const msgLock = MsgLock.fromPartial({
    signer: nobleAddr.value,
    vault,
    amount: `${usdnAmount}`,
  });
  const protoMessages = [
    Any.toJSON(MsgSwap.toProtoMsg(msgSwap)),
    Any.toJSON(MsgLock.toProtoMsg(msgLock)),
  ];
  return { msgSwap, msgLock, protoMessages };
};

/**
 * Build Noble `MsgUnlock` and `MsgSwap` payloads for a USDN withdraw step.
 *
 * If `usdnOut` is omitted, returns only swap (USDN -> USDC) at `usdcOut`.
 * If `usdnOut` is provided, unlocks that USDN amount first, then swaps to USDC.
 *
 * @param nobleAddr - Noble account that signs/executes the messages.
 * @param usdcOut - Target USDC amount in `uusdc`.
 * @param opts - Optional unlock/swap parameters.
 */
export const makeUnlockSwapMessages = (
  nobleAddr: CosmosChainAddress,
  usdcOut: bigint,
  {
    poolId = 0n,
    denom = 'uusdn',
    denomTo = 'uusdc',
    vault = VaultType.STAKED,
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
  /** Supply USDC into USDN: swap and optionally lock into a Noble vault. */
  supply: async (ctx, amount, src, ...optsArgs) => {
    const { usdnOut, vault } = ctx;
    const { ica } = src;
    const nobleAddr = ica.getAddress();

    const { msgSwap, msgLock, protoMessages } = makeSwapLockMessages(
      nobleAddr,
      amount.value,
      { usdnOut, vault },
    );

    trace('executing', [msgSwap, msgLock].filter(Boolean));
    const result = await ica.executeEncodedTx(protoMessages, ...optsArgs);
    trace('supply result', result);
  },
  /** Withdraw from USDN: optionally unlock vault position, then swap USDN to USDC. */
  withdraw: async (ctx, amount, dest, claim, ...optsArgs) => {
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
    const result = await ica.executeEncodedTx(protoMessages, ...optsArgs);
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
  /** Transfer USDC from Agoric local account to Noble ICA over IBC. */
  apply: async (ctx, amount, src, dest, ...optsArgs) => {
    const { denom } = ctx.usdc;
    const denomAmount = { value: amount.value, denom };
    await src.lca.transfer(dest.ica.getAddress(), denomAmount, ...optsArgs);
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
  /** Transfer USDC from Noble ICA back to Agoric local account over IBC. */
  apply: async (ctx, amount, src, dest, ...optsArgs) => {
    const nobleAmount = { value: amount.value, denom: 'uusdc' };
    await src.ica.transfer(dest.lca.getAddress(), nobleAmount, ...optsArgs);
  },
} as const satisfies TransportDetail<
  'IBC from Noble',
  'noble',
  'agoric',
  { usdc: { denom: Denom } }
>;
harden(nobleToAgoric);
