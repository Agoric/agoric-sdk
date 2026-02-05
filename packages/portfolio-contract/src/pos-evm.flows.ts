/**
 * @file flows for Aave, Compound, Beefy, and ERC4626 protocols on EVM chains
 *
 * Uses either a legacy Wallet contract or a new router based remote account.
 * In both cases uses Axelar GMP.
 *
 * @see {@link CCTP}
 * @see {@link AaveProtocol}
 * @see {@link CompoundProtocol}
 * @see {@link BeefyProtocol}
 * @see {@link ERC4626Protocol}
 */
import type { GuestInterface } from '@agoric/async-flow';
import { makeTracer } from '@agoric/internal';
import { encodeHex } from '@agoric/internal/src/hex.js';
import type {
  AccountId,
  Bech32Address,
  Chain,
  DenomAmount,
  OrchestrationOptions,
} from '@agoric/orchestration';
import {
  coerceAccountId,
  leftPadEthAddressTo32Bytes,
} from '@agoric/orchestration/src/utils/address.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import type { MovementDesc } from '@agoric/portfolio-api';
import { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import { fromBech32 } from '@cosmjs/encoding';
import { Fail, q, X } from '@endo/errors';
import { makeEvmAbiCallBatch } from './evm-facade.ts';
import { aavePoolABI, aaveRewardsControllerABI } from './interfaces/aave.ts';
import { beefyVaultABI } from './interfaces/beefy.ts';
import {
  compoundABI,
  compoundRewardsControllerABI,
} from './interfaces/compound.ts';
import { erc20ABI } from './interfaces/erc20.ts';
import { erc4626ABI } from './interfaces/erc4626.ts';
import {
  tokenMessengerABI,
  tokenMessengerV2ABI,
} from './interfaces/token-messenger.ts';
import { walletHelperABI } from './interfaces/wallet-helper.ts';
import { generateNobleForwardingAddress } from './noble-fwd-calc.js';
import type {
  AxelarId,
  EVMContractAddresses,
  GmpAddresses,
} from './portfolio.contract.ts';
import {
  type LocalAccount,
  type PortfolioInstanceContext,
  type ProtocolDetail,
  type TransportDetail,
} from './portfolio.flows.ts';
import { TxType } from './resolver/constants.js';
import type { ResolverKit } from './resolver/resolver.exo.ts';
import type { PoolKey } from './type-guards.ts';
import { appendTxIds } from './utils/traffic.ts';
import {
  provideEVMAccount,
  provideEVMAccountWithPermit,
  sendGMPContractCall,
  sendPermit2GMP,
  type GMPAccountStatus,
} from './axelar-gmp-legacy.flows.ts';

export {
  provideEVMAccount,
  provideEVMAccountWithPermit,
  sendGMPContractCall,
  sendPermit2GMP,
  type GMPAccountStatus,
};

export type EVMContext = {
  feeAccount: LocalAccount;
  lca: LocalAccount;
  gmpFee: DenomAmount;
  gmpChain: Chain<{ chainId: string }>;
  addresses: EVMContractAddresses;
  gmpAddresses: GmpAddresses;
  axelarIds: AxelarId;
  poolKey?: PoolKey;
  resolverClient: GuestInterface<ResolverKit['client']>;
  nobleForwardingChannel: `channel-${number}`;
  detail?: MovementDesc['detail'];
};

const trace = makeTracer('GMPF');
const { keys } = Object;

/** @see {@link https://developers.circle.com/cctp/supported-domains} */
const nobleDomain = 4;

const bech32ToBytes32 = (addr: Bech32Address) => {
  if (addr === 'noble1test') {
    trace('XXX replacing test address to convert to bytes32');
    addr = makeTestAddress(3, 'noble');
  }
  const { data } = fromBech32(addr);
  const dh = encodeHex(data);
  const zeroesNeeded = 64 - dh.length;
  const paddedAddress = '0'.repeat(zeroesNeeded) + dh;
  const bs: `0x${string}` = `0x${paddedAddress}`;
  return bs;
};

export const CCTPfromEVM = {
  how: 'CCTP',
  connections: keys(AxelarChain).map((src: AxelarChain) => ({
    src,
    dest: 'agoric',
  })),
  apply: async (ctx, amount, src, dest, ...optsArgs) => {
    const traceTransfer = trace.sub('CCTPin').sub(src.chainName);
    traceTransfer('transfer', amount, 'from', src.remoteAddress);
    const { addresses, nobleForwardingChannel } = ctx;
    const fwdAddr = generateNobleForwardingAddress(
      nobleForwardingChannel,
      dest.lca.getAddress().value,
    );
    traceTransfer('Noble forwarding address', fwdAddr);
    const mintRecipient = bech32ToBytes32(fwdAddr); // XXX we generate bech32 only to go back to bytes

    const session = makeEvmAbiCallBatch();
    const usdc = session.makeContract(addresses.usdc, erc20ABI);
    const tm = session.makeContract(
      addresses.tokenMessenger,
      tokenMessengerABI,
    );
    usdc.approve(addresses.tokenMessenger, amount.value);
    tm.depositForBurn(amount.value, nobleDomain, mintRecipient, addresses.usdc);
    const calls = session.finish();

    const { result, txId } = ctx.resolverClient.registerTransaction(
      TxType.CCTP_TO_AGORIC,
      coerceAccountId(dest.lca.getAddress()),
      amount.value,
    );

    const sent = sendGMPContractCall(ctx, src, calls, ...optsArgs);
    appendTxIds(optsArgs[0]?.progressTracker, [txId]);
    await sent;
    await result;
  },
} as const satisfies TransportDetail<'CCTP', AxelarChain, 'agoric', EVMContext>;
harden(CCTPfromEVM);

/**
 * Noble CCTP relayer policy is to not relay very small amounts.
 *
 * XXX could be configurable for test networks
 */
const CCTP_OUTBOUND_THRESHOLD = 1_000_000n;

export const CCTP = {
  how: 'CCTP',
  connections: keys(AxelarChain).map((dest: AxelarChain) => ({
    src: 'noble',
    dest,
  })),
  apply: async (
    ctx: PortfolioInstanceContext,
    amount,
    src,
    dest,
    ...optsArgs: [OrchestrationOptions?]
  ) => {
    const traceTransfer = trace.sub('CCTPout').sub(dest.chainName);
    const denomAmount: DenomAmount = { denom: 'uusdc', value: amount.value };
    const { chainId, remoteAddress } = dest;
    traceTransfer('transfer', denomAmount, 'to', remoteAddress);
    amount.value >= CCTP_OUTBOUND_THRESHOLD ||
      Fail`too small to relay: ${q(amount)} below ${CCTP_OUTBOUND_THRESHOLD}`;
    const destinationAddress: AccountId = `${chainId}:${remoteAddress}`;
    const { ica } = src;

    const { result, txId } = ctx.resolverClient.registerTransaction(
      TxType.CCTP_TO_EVM,
      destinationAddress,
      amount.value,
    );
    appendTxIds(optsArgs[0]?.progressTracker, [txId]);

    // XXX depositForBurn optional `caller` argument needs to be `undefined` if
    // we're adding any optsArgs.
    const callerAndOptsArgs = (
      optsArgs.length > 0 ? [undefined, ...optsArgs] : []
    ) as [AccountId?, OrchestrationOptions?];
    await Promise.all([
      ica.depositForBurn(destinationAddress, denomAmount, ...callerAndOptsArgs),
      result,
    ]);
    traceTransfer('transfer complete.');
  },
} as const satisfies TransportDetail<'CCTP', 'noble', AxelarChain>;
harden(CCTP);

/**
 * CCTPv2 domain IDs (unchanged from v1)
 * @see {@link https://developers.circle.com/cctp/supported-domains}
 */
const CCTP_DOMAINS: Record<AxelarChain, number> = {
  Ethereum: 0,
  Avalanche: 1,
  Optimism: 2,
  Arbitrum: 3,
  Base: 6,
};

/**
 * Finality thresholds for CCTPv2 attestation.
 * Lower threshold = faster but potentially less secure.
 * Higher threshold = slower but fully finalized.
 */
const FINALITY_THRESHOLD = {
  /** Fast attestation with confirmed blocks */
  CONFIRMED: 1000,
  /** Slower attestation with fully finalized blocks */
  FINALIZED: 2000,
} as const;

const ZERO_BYTES32: `0x${string}` = `0x${'0'.repeat(64)}`;

/**
 * CCTPv2 transport for direct EVM-to-EVM USDC transfers.
 *
 * CCTPv2 enables direct cross-chain transfers between EVM chains
 * without routing through Noble. This provides:
 * - Faster transfers (~13-60 seconds vs ~18 minutes)
 * - Lower costs (single hop vs two hops)
 * - Configurable finality/speed tradeoffs via minFinalityThreshold
 *
 * @see {@link https://developers.circle.com/cctp/docs/cctp-v2}
 */
export const CCTPv2 = {
  how: 'CCTPv2',
  connections: keys(AxelarChain).flatMap((src: AxelarChain) =>
    keys(AxelarChain)
      .filter(dest => dest !== src)
      .map((dest: AxelarChain) => ({ src, dest })),
  ),
  apply: async (ctx, amount, src, dest, ...optsArgs) => {
    const traceTransfer = trace
      .sub('CCTPv2')
      .sub(`${src.chainName}->${dest.chainName}`);
    traceTransfer('transfer', amount);

    const { addresses } = ctx;
    const tokenMessengerV2 = addresses.tokenMessengerV2;
    if (!tokenMessengerV2) {
      throw Fail`CCTPv2 not available on ${q(src.chainName)}: tokenMessengerV2 address not configured`;
    }

    const destDomain = CCTP_DOMAINS[dest.chainName];
    const mintRecipient =
      `0x${encodeHex(leftPadEthAddressTo32Bytes(dest.remoteAddress))}` as const;

    const session = makeEvmAbiCallBatch();
    const usdc = session.makeContract(addresses.usdc, erc20ABI);
    const tm = session.makeContract(tokenMessengerV2, tokenMessengerV2ABI);

    const { detail } = ctx;
    const maxFee = detail?.maxFee || 0n;
    const minFinalityThreshold =
      Number(detail?.minFinalityThreshold) === FINALITY_THRESHOLD.CONFIRMED
        ? FINALITY_THRESHOLD.CONFIRMED
        : FINALITY_THRESHOLD.FINALIZED;

    usdc.approve(tokenMessengerV2, amount.value);
    tm.depositForBurn(
      amount.value,
      destDomain,
      mintRecipient,
      addresses.usdc,
      // destinationCaller: bytes32(0) = any caller allowed
      ZERO_BYTES32,
      maxFee,
      minFinalityThreshold,
    );

    const calls = session.finish();

    const { txId, result } = ctx.resolverClient.registerTransaction(
      TxType.CCTP_TO_EVM,
      `${dest.chainId}:${dest.remoteAddress}`,
      amount.value,
      undefined, // expectedAddr - not used for CCTP_V2
      `${src.chainId}:${src.remoteAddress}`, // sourceAddress for domain mapping
    );

    const sent = sendGMPContractCall(ctx, src, calls, ...optsArgs);
    appendTxIds(optsArgs[0]?.progressTracker, [txId]);
    await sent;
    await result;

    traceTransfer('transfer complete');
  },
} as const satisfies TransportDetail<
  'CCTPv2',
  AxelarChain,
  AxelarChain,
  EVMContext
>;
harden(CCTPv2);

export const AaveProtocol = {
  protocol: 'Aave',
  chains: keys(AxelarChain) as AxelarChain[],
  supply: async (ctx, amount, src, ...optsArgs) => {
    const { remoteAddress } = src;
    const { addresses: a } = ctx;

    const session = makeEvmAbiCallBatch();
    const usdc = session.makeContract(a.usdc, erc20ABI);
    const aave = session.makeContract(a.aavePool, aavePoolABI);
    usdc.approve(a.aavePool, amount.value);
    aave.supply(a.usdc, amount.value, remoteAddress, 0);
    const calls = session.finish();

    return sendGMPContractCall(ctx, src, calls, ...optsArgs);
  },
  withdraw: async (ctx, amount, dest, claim, ...optsArgs) => {
    const { remoteAddress } = dest;
    const { addresses: a } = ctx;

    const session = makeEvmAbiCallBatch();
    if (claim) {
      const aaveRewardsController = session.makeContract(
        a.aaveRewardsController,
        aaveRewardsControllerABI,
      );
      aaveRewardsController.claimAllRewardsToSelf([a.aaveUSDC]);
    }
    const aave = session.makeContract(a.aavePool, aavePoolABI);
    aave.withdraw(a.usdc, amount.value, remoteAddress);
    const calls = session.finish();

    return sendGMPContractCall(ctx, dest, calls, ...optsArgs);
  },
} as const satisfies ProtocolDetail<'Aave', AxelarChain, EVMContext>;

export const CompoundProtocol = {
  protocol: 'Compound',
  chains: keys(AxelarChain) as AxelarChain[],
  supply: async (ctx, amount, src, ...optsArgs) => {
    const { addresses: a } = ctx;
    const session = makeEvmAbiCallBatch();
    const usdc = session.makeContract(a.usdc, erc20ABI);
    const compound = session.makeContract(a.compound, compoundABI);
    usdc.approve(a.compound, amount.value);
    compound.supply(a.usdc, amount.value);
    const calls = session.finish();

    return sendGMPContractCall(ctx, src, calls, ...optsArgs);
  },
  withdraw: async (ctx, amount, dest, claim, ...optsArgs) => {
    const { addresses: a } = ctx;
    const session = makeEvmAbiCallBatch();
    if (claim) {
      const compoundRewardsController = session.makeContract(
        a.compoundRewardsController,
        compoundRewardsControllerABI,
      );
      compoundRewardsController.claim(a.compound, dest.remoteAddress, true);
    }
    const compound = session.makeContract(a.compound, compoundABI);
    compound.withdraw(a.usdc, amount.value);
    const calls = session.finish();

    return sendGMPContractCall(ctx, dest, calls, ...optsArgs);
  },
} as const satisfies ProtocolDetail<'Compound', AxelarChain, EVMContext>;

export const BeefyProtocol = {
  protocol: 'Beefy',
  chains: keys(AxelarChain) as AxelarChain[],
  supply: async (ctx, amount, src, ...optsArgs) => {
    const { addresses: a, poolKey } = ctx;
    const session = makeEvmAbiCallBatch();
    const usdc = session.makeContract(a.usdc, erc20ABI);
    const vaultAddress =
      a[poolKey] ||
      assert.fail(X`Beefy pool key ${q(poolKey)} not found in addresses`);
    const vault = session.makeContract(vaultAddress, beefyVaultABI);
    usdc.approve(vaultAddress, amount.value);
    vault.deposit(amount.value);
    const calls = session.finish();

    return sendGMPContractCall(ctx, src, calls, ...optsArgs);
  },
  withdraw: async (ctx, amount, dest, _claim, ...optsArgs) => {
    const { addresses: a, poolKey } = ctx;
    const session = makeEvmAbiCallBatch();
    const vaultAddress =
      a[poolKey] ||
      assert.fail(X`Beefy pool key ${q(poolKey)} not found in addresses`);
    const vault = session.makeContract(vaultAddress, beefyVaultABI);
    const walletHelper = session.makeContract(a.walletHelper, walletHelperABI);
    // Max possible value for approval
    const maxUint256 = 2n ** 256n - 1n;
    // Give infinite approval because we dont know the exact amount the helper will withdraw
    vault.approve(a.walletHelper, maxUint256);
    walletHelper.beefyWithdrawUSDC(vaultAddress, amount.value);
    vault.approve(a.walletHelper, 0n);
    const calls = session.finish();

    return sendGMPContractCall(ctx, dest, calls, ...optsArgs);
  },
} as const satisfies ProtocolDetail<
  'Beefy',
  AxelarChain,
  EVMContext & { poolKey: PoolKey }
>;

export const ERC4626Protocol = {
  protocol: 'ERC4626',
  chains: keys(AxelarChain) as AxelarChain[],
  supply: async (ctx, amount, src, ...optsArgs) => {
    const { addresses: a, poolKey } = ctx;
    const { remoteAddress } = src;
    const session = makeEvmAbiCallBatch();
    const usdc = session.makeContract(a.usdc, erc20ABI);
    const vaultAddress =
      a[poolKey] ||
      assert.fail(X`ERC4626 pool key ${q(poolKey)} not found in addresses`);
    const vault = session.makeContract(vaultAddress, erc4626ABI);
    usdc.approve(vaultAddress, amount.value);
    vault.deposit(amount.value, remoteAddress);
    const calls = session.finish();

    await sendGMPContractCall(ctx, src, calls, ...optsArgs);
  },
  withdraw: async (ctx, amount, dest, _claim, ...optsArgs) => {
    const { addresses: a, poolKey } = ctx;
    const { remoteAddress } = dest;
    const session = makeEvmAbiCallBatch();
    const vaultAddress =
      a[poolKey] ||
      assert.fail(X`ERC4626 pool key ${q(poolKey)} not found in addresses`);
    const vault = session.makeContract(vaultAddress, erc4626ABI);
    vault.withdraw(amount.value, remoteAddress, remoteAddress);
    const calls = session.finish();

    await sendGMPContractCall(ctx, dest, calls, ...optsArgs);
  },
} as const satisfies ProtocolDetail<
  'ERC4626',
  AxelarChain,
  EVMContext & { poolKey: PoolKey }
>;
