/**
 * @file flows for Aave, Compound, Beefy, and ERC4626 protocols on EVM chains
 *
 * Since Axelar GMP (General Message Passing) is used in both cases,
 * we use "gmp" in the filename.
 *
 * @see {@link provideEVMAccount}
 * @see {@link CCTP}
 * @see {@link AaveProtocol}
 * @see {@link CompoundProtocol}
 * @see {@link BeefyProtocol}
 * @see {@link ERC4626Protocol}
 */
import type { GuestInterface } from '@agoric/async-flow';
import type { NatValue } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { encodeHex } from '@agoric/internal/src/hex.js';
import type {
  AccountId,
  BaseChainInfo,
  Bech32Address,
  Chain,
  DenomAmount,
  OrchestrationOptions,
} from '@agoric/orchestration';
import {
  AxelarGMPMessageType,
  type AxelarGmpOutgoingMemo,
  type ContractCall,
} from '@agoric/orchestration/src/axelar-types.js';
import {
  coerceAccountId,
  leftPadEthAddressTo32Bytes,
  sameEvmAddress,
} from '@agoric/orchestration/src/utils/address.js';
import { buildGMPPayload } from '@agoric/orchestration/src/utils/gmp.js';
import { PermitWitnessTransferFromInputComponents } from '@agoric/orchestration/src/utils/permit2.ts';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import type { MovementDesc } from '@agoric/portfolio-api';
import { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import type { PermitDetails } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import { fromBech32 } from '@cosmjs/encoding';
import { Fail, makeError, q, X } from '@endo/errors';
import { hexToBytes } from '@noble/hashes/utils';
import type { Address } from 'viem';
import { makeEvmAbiCallBatch, makeGmpBuilder } from './evm-facade.ts';
import { aavePoolABI, aaveRewardsControllerABI } from './interfaces/aave.ts';
import { beefyVaultABI } from './interfaces/beefy.ts';
import {
  compoundABI,
  compoundRewardsControllerABI,
} from './interfaces/compound.ts';
import { erc20ABI } from './interfaces/erc20.ts';
import { erc4626ABI } from './interfaces/erc4626.ts';
import { depositFactoryABI, factoryABI } from './interfaces/orch-factory.ts';
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
import type { GMPAccountInfo, PortfolioKit } from './portfolio.exo.ts';
import {
  type LocalAccount,
  type PortfolioInstanceContext,
  type ProtocolDetail,
  type TransportDetail,
} from './portfolio.flows.ts';
import { TxType } from './resolver/constants.js';
import type { ResolverKit } from './resolver/resolver.exo.ts';
import type { TxId } from './resolver/types.ts';
import type { PoolKey } from './type-guards.ts';
import { predictWalletAddress } from './utils/evm-orch-factory.ts';
import { appendTxIds } from './utils/traffic.ts';

const trace = makeTracer('GMPF');
const { keys } = Object;

export type GMPAccountStatus = GMPAccountInfo & {
  /** created and ready to accept GMP messages */
  ready: Promise<unknown>;
  /** completely finished the makeAccount/createAndDeposit transaction */
  done: Promise<unknown>;
};

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/c3305c4/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol#L137-L150 Factory.sol (_execute method)}
 */

type ProvideEVMAccountSendCall = (params: {
  dest: {
    axelarId: string;
    address: Address;
  };
  fee: DenomAmount;
  portfolioLca: LocalAccount;
  contractAccount: LocalAccount;
  gmpChain: Chain<{ chainId: string }>;
  gmpAddresses: GmpAddresses;
  expectedWalletAddress: Address;
  orchOpts?: OrchestrationOptions;
}) => Promise<void>;

type ProvideEVMAccountSendCallFactory = (
  sendCallArg?: unknown,
) => ProvideEVMAccountSendCall;

// Shared "provide pattern" with a pluggable GMP call, so we can reuse the
// reservation/resolve/error-handling logic across account-creation variants.
const makeProvideEVMAccount = ({
  // XXX getSendCall is awkward given the mode switch
  getSendCall,
  txType,
  mode,
}: {
  getSendCall: ProvideEVMAccountSendCallFactory;
  txType: TxType;
  mode: 'makeAccount' | 'createAndDeposit';
}) => {
  return (
    chainName: AxelarChain,
    chainInfo: BaseChainInfo,
    gmp: {
      chain: Chain<{ chainId: string }>;
      fee: NatValue;
    },
    lca: LocalAccount,
    ctx: PortfolioInstanceContext,
    pk: GuestInterface<PortfolioKit>,
    opts: { orchOpts?: OrchestrationOptions; sendCallArg?: unknown } = {},
  ): GMPAccountStatus => {
    // sendCall is either sendMakeAccountCall or sendCreateAndDepositCall
    const sendCall = getSendCall(opts.sendCallArg);
    const pId = pk.reader.getPortfolioId();
    const traceChain = trace.sub(`portfolio${pId}`).sub(chainName);

    const contracts = ctx.contracts[chainName];
    const factoryAddress = contracts.factory;
    assert(factoryAddress);

    const predictAddress = (owner: Bech32Address) => {
      traceChain('factory', mode, factoryAddress);
      const remoteAddress = predictWalletAddress({
        owner,
        factoryAddress,
        gasServiceAddress: contracts.gasService,
        gatewayAddress: contracts.gateway,
        // XXX converting a 9k hex string to bytes for every account is a waste.
        // But Uint8Array is not Passable. Pass it via prepareXYZ()?
        walletBytecode: hexToBytes(ctx.walletBytecode.replace(/^0x/, '')),
      });
      const info: GMPAccountInfo = {
        namespace: 'eip155',
        chainName,
        chainId: `${chainInfo.namespace}:${chainInfo.reference}`,
        remoteAddress,
      };
      traceChain('CREATE2', info.remoteAddress, 'for', owner);
      return info;
    };
    const reserve = pk.manager.reserveAccountState(chainName);
    const readyP = reserve.ready as unknown as Promise<void>; // XXX host/guest

    // Only use the account manager if we're responsible to resolveAccount(...).
    const manager = ['new', 'failed'].includes(reserve.state)
      ? pk.manager
      : undefined;

    const evmAccount = manager
      ? predictAddress(lca.getAddress().value)
      : pk.reader.getGMPInfo(chainName);

    // Bail out early if another caller created the account, and this is not a deposit.
    if (
      ['pending', 'ok'].includes(reserve.state) &&
      mode !== 'createAndDeposit'
    ) {
      return {
        ...evmAccount,
        ready: readyP,
        done: readyP,
      };
    }

    if (reserve.state === 'new') {
      manager!.initAccountInfo(evmAccount);
    } else {
      const expectedAddress = predictAddress(
        lca.getAddress().value,
      ).remoteAddress;

      if (!sameEvmAddress(evmAccount.remoteAddress, expectedAddress)) {
        const done = Promise.reject(
          makeError(
            `account already exists at ${evmAccount.remoteAddress}, factory expects ${expectedAddress}`,
          ),
        );

        return {
          ...evmAccount,
          ready: readyP,
          done,
        };
      }
    }

    const installContractWithDeposit = async () => {
      let txId: TxId | undefined;
      await null;
      try {
        const axelarId = ctx.axelarIds[chainName];
        const fee = { denom: ctx.gmpFeeInfo.denom, value: gmp.fee };
        fee.value > 0n || Fail`axelar makeAccount requires > 0 fee`;

        const contractAccount = await ctx.contractAccount;

        const src = contractAccount.getAddress();
        traceChain('Axelar fee sent from', src.value);

        const contractKey = {
          makeAccount: 'factory',
          createAndDeposit: 'depositFactory',
        } as const;
        const destinationAddress = contracts[contractKey[mode]];

        const sourceAddress = coerceAccountId(
          mode === 'createAndDeposit'
            ? contractAccount.getAddress()
            : lca.getAddress(),
        );
        const watchTx = ctx.resolverClient.registerTransaction(
          txType,
          `${evmAccount.chainId}:${destinationAddress}`,
          undefined,
          evmAccount.remoteAddress,
          sourceAddress,
          factoryAddress,
        );
        txId = watchTx.txId;
        appendTxIds(opts.orchOpts?.progressTracker, [txId]);

        const result = watchTx.result as unknown as Promise<void>; // XXX host/guest;
        result.catch(err => {
          trace(txId, 'rejected', err);
        });

        await sendCall({
          dest: { axelarId, address: destinationAddress },
          portfolioLca: lca,
          fee,
          gmpAddresses: ctx.gmpAddresses,
          gmpChain: gmp.chain,
          contractAccount,
          expectedWalletAddress: evmAccount.remoteAddress,
          ...('orchOpts' in opts ? { orchOpts: opts.orchOpts } : {}),
        });

        traceChain('await', mode, txId);
        await result;

        manager?.resolveAccount(evmAccount);
      } catch (reason) {
        traceChain('failed to', mode, reason);
        manager?.releaseAccount(chainName, reason);
        if (txId) {
          ctx.resolverClient.unsubscribe(txId, `unsubscribe: ${reason}`);
        }
        throw reason;
      }
    };

    const installed = installContractWithDeposit();
    return {
      ...evmAccount,
      ready: readyP,
      done: installed.then(() => readyP),
    };
  };
};

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

/**
 * Invoke EVM Wallet Factory contract to create a remote account
 * at a predicatble address.
 *
 * The factory contract:
 * 1. Creates the smart wallet: `createSmartWallet(sourceAddress)`
 * 2. Emits a SmartWalletCreated event.
 */
export const sendMakeAccountCall = async ({
  dest,
  fee,
  portfolioLca,
  contractAccount: feeAccount,
  gmpAddresses,
  gmpChain,
  expectedWalletAddress,
  ...optsArgs
}: Parameters<ProvideEVMAccountSendCall>[0]) => {
  const { AXELAR_GMP, AXELAR_GAS } = gmpAddresses;

  const gmpBuilder = makeGmpBuilder();
  const factory = gmpBuilder.makeContract(dest.address, factoryABI);
  factory.createSmartWallet(expectedWalletAddress);
  const payload = gmpBuilder.getPayload();

  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: dest.axelarId,
    destination_address: dest.address,
    payload: Array.from(payload),
    type: AxelarGMPMessageType.ContractCall,
    fee: { amount: String(fee.value), recipient: AXELAR_GAS },
  };
  const { chainId } = await gmpChain.getChainInfo();

  await feeAccount.send(
    portfolioLca.getAddress(),
    fee,
    ...('orchOpts' in optsArgs ? [optsArgs.orchOpts] : []),
  );

  const gmp = { chainId, value: AXELAR_GMP, encoding: 'bech32' as const };
  await portfolioLca.transfer(gmp, fee, {
    ...optsArgs.orchOpts,
    memo: JSON.stringify(memo),
  });
};

export const provideEVMAccount = makeProvideEVMAccount({
  getSendCall: () => sendMakeAccountCall,
  txType: TxType.MAKE_ACCOUNT,
  mode: 'makeAccount',
});

/**
 * Send a GMP call that creates a smart wallet and deposits funds via Permit2.
 */
export const sendCreateAndDepositCall = async ({
  dest,
  fee,
  portfolioLca,
  contractAccount,
  permit2Payload,
  gmpAddresses,
  gmpChain,
  expectedWalletAddress,
  ...optsArgs
}: Parameters<ProvideEVMAccountSendCall>[0] & {
  permit2Payload: PermitDetails['permit2Payload'];
}) => {
  const lcaOwner = portfolioLca.getAddress().value;
  const {
    owner: tokenOwner,
    permit,
    signature,
    witness,
    witnessTypeString,
  } = permit2Payload;

  const gmpBuilder = makeGmpBuilder();
  const factory = gmpBuilder.makeContract(dest.address, depositFactoryABI);
  factory.createAndDeposit({
    lcaOwner,
    tokenOwner,
    permit,
    signature,
    witness,
    witnessTypeString,
    expectedWalletAddress,
  });
  const payload = gmpBuilder.getPayload();

  const { AXELAR_GMP, AXELAR_GAS } = gmpAddresses;
  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: dest.axelarId,
    destination_address: dest.address,
    payload: Array.from(payload),
    type: AxelarGMPMessageType.ContractCall,
    fee: { amount: String(fee.value), recipient: AXELAR_GAS },
  };
  const { chainId } = await gmpChain.getChainInfo();

  const gmp = { chainId, value: AXELAR_GMP, encoding: 'bech32' as const };
  await contractAccount.transfer(gmp, fee, {
    ...optsArgs.orchOpts,
    memo: JSON.stringify(memo),
  });
};

const makeSendCreateAndDepositCall = (
  permit2Payload: PermitDetails['permit2Payload'],
): ProvideEVMAccountSendCall => {
  return params => sendCreateAndDepositCall({ ...params, permit2Payload });
};

const provideEVMAccountWithPermitBase = makeProvideEVMAccount({
  getSendCall: makeSendCreateAndDepositCall,
  txType: TxType.MAKE_ACCOUNT,
  mode: 'createAndDeposit',
});

export const provideEVMAccountWithPermit = (
  chainName: AxelarChain,
  chainInfo: BaseChainInfo,
  gmp: {
    chain: Chain<{ chainId: string }>;
    fee: NatValue;
  },
  lca: LocalAccount,
  ctx: PortfolioInstanceContext,
  pk: GuestInterface<PortfolioKit>,
  permit2Payload: PermitDetails['permit2Payload'],
  orchOpts?: OrchestrationOptions,
): GMPAccountStatus =>
  provideEVMAccountWithPermitBase(chainName, chainInfo, gmp, lca, ctx, pk, {
    orchOpts,
    sendCallArg: permit2Payload,
  });

/**
 * Sends a GMP call to execute contract calls on a remote smart wallet.
 *
 * The payload is encoded as CallParams[] which the smart wallet contract
 * decodes and executes via multicall(). The remote wallet is itself a smart contract.
 *
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/3e5c4a140bf5e9f1606c72f54815d61231ef1fa5/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol#L40-L66 Factory.sol (lines 40–66)}
 *
 * The smart wallet contract:
 * 1. Decodes payload as CallParams[]: `CallParams[] memory calls = abi.decode(payload, (CallParams[]))`
 * 2. Executes each call via multicall: `calls[i].target.call(calls[i].data)`
 */
export const sendGMPContractCall = async (
  ctx: EVMContext,
  gmpAcct: GMPAccountInfo,
  calls: ContractCall[],
  ...optsArgs: [OrchestrationOptions?]
) => {
  const {
    lca,
    gmpChain,
    gmpFee: fee,
    gmpAddresses,
    resolverClient,
    axelarIds,
  } = ctx;
  const { chainName, remoteAddress, chainId: gmpChainId } = gmpAcct;
  const axelarId = axelarIds[chainName];

  const sourceAddress = coerceAccountId(lca.getAddress());
  const { result, txId } = resolverClient.registerTransaction(
    TxType.GMP,
    `${gmpChainId}:${remoteAddress}`,
    undefined,
    undefined,
    sourceAddress,
  );
  appendTxIds(optsArgs[0]?.progressTracker, [txId]);

  const { AXELAR_GMP, AXELAR_GAS } = gmpAddresses;
  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: axelarId,
    destination_address: remoteAddress,
    payload: buildGMPPayload(calls, txId),
    type: AxelarGMPMessageType.ContractCall,
    fee: { amount: String(fee.value), recipient: AXELAR_GAS },
  };
  const { chainId } = await gmpChain.getChainInfo();
  const gmp = {
    chainId,
    value: AXELAR_GMP,
    encoding: 'bech32' as const,
  };
  await ctx.feeAccount.send(lca.getAddress(), fee, ...optsArgs);
  await lca.transfer(gmp, fee, {
    ...optsArgs[0],
    memo: JSON.stringify(memo),
  });
  await result;
};

// XXX refactor overlap with PermitWitnessTransferFromFunctionABIType
// that one results in type errors
const permit2Abi = [
  {
    name: 'permitWitnessTransferFrom',
    inputs: PermitWitnessTransferFromInputComponents,
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Sends a GMP call to execute a Permit2 permitWitnessTransferFrom.
 *
 * This transfers tokens from the user's EOA to the portfolio's smart wallet
 * using the user's pre-signed permit2 authorization.
 *
 * @param ctx - EVM context with LCA and GMP configuration
 * @param gmpAcct - Target smart wallet info
 * @param permit2Payload - The permit2 payload from the user's signature
 * @param transferAmount - Amount to transfer
 * @param optsArgs - Optional orchestration options
 */
export const sendPermit2GMP = async (
  ctx: EVMContext,
  gmpAcct: GMPAccountInfo,
  permit2Payload: PermitDetails['permit2Payload'],
  transferAmount: bigint,
  ...optsArgs: [OrchestrationOptions?]
) => {
  const {
    lca,
    gmpChain,
    gmpFee: fee,
    gmpAddresses,
    resolverClient,
    axelarIds,
    addresses,
  } = ctx;
  const { chainName, remoteAddress, chainId: gmpChainId } = gmpAcct;
  const walletAddress = remoteAddress as Address;
  const axelarId = axelarIds[chainName];

  const { permit, owner, witness, witnessTypeString, signature } =
    permit2Payload;

  transferAmount <= permit.permitted.amount ||
    Fail`insufficient permitted amount ${q(permit.permitted.amount)} for transferAmount ${q(transferAmount)}`;

  // Build the transferDetails - tokens go to the wallet
  const transferDetails = {
    to: walletAddress,
    requestedAmount: transferAmount,
  };

  const session = makeEvmAbiCallBatch();
  const permit2 = session.makeContract(addresses.permit2, permit2Abi);
  permit2.permitWitnessTransferFrom(
    permit,
    transferDetails,
    owner,
    witness,
    witnessTypeString,
    signature,
  );
  const calls = session.finish();

  const sourceAddress = coerceAccountId(lca.getAddress());
  const { result, txId } = resolverClient.registerTransaction(
    TxType.GMP,
    `${gmpChainId}:${remoteAddress}`,
    undefined,
    undefined,
    sourceAddress,
  );

  const { AXELAR_GMP, AXELAR_GAS } = gmpAddresses;
  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: axelarId,
    destination_address: remoteAddress,
    payload: buildGMPPayload(calls, txId),
    type: AxelarGMPMessageType.ContractCall,
    fee: { amount: String(fee.value), recipient: AXELAR_GAS },
  };
  const { chainId } = await gmpChain.getChainInfo();
  const gmp = {
    chainId,
    value: AXELAR_GMP,
    encoding: 'bech32' as const,
  };
  await ctx.feeAccount.send(lca.getAddress(), fee, ...optsArgs);
  await lca.transfer(gmp, fee, {
    ...optsArgs[0],
    memo: JSON.stringify(memo),
  });
  await result;
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
