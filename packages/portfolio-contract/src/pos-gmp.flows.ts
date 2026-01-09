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
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import { buildGMPPayload } from '@agoric/orchestration/src/utils/gmp.js';
import { encodeAbiParameters } from '@agoric/orchestration/src/vendor/viem/viem-abi.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import {
  PermitTransferFromComponents,
  PermitTransferFromInternalType,
} from '@agoric/orchestration/src/utils/permit2.ts';
import type { PermitDetails } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import { fromBech32 } from '@cosmjs/encoding';
import { Fail, q, X } from '@endo/errors';
import { hexToBytes } from '@noble/hashes/utils';
import type { AbiParameter, AbiParameterToPrimitiveType } from 'viem';
import { ERC20, makeEVMSession, type EVMT } from './evm-facade.ts';
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

const trace = makeTracer('GMPF');
const { keys } = Object;

export type GMPAccountStatus = GMPAccountInfo & {
  /** created and ready to accept GMP messages */
  ready: Promise<unknown>;
};

export const CREATE_AND_DEPOSIT_ABI_PARAMS = [
  {
    type: 'tuple',
    name: 'p',
    components: [
      { name: 'lcaOwner', type: 'string' },
      { name: 'tokenOwner', type: 'address' },
      {
        name: 'permit',
        type: 'tuple',
        internalType: PermitTransferFromInternalType,
        components: PermitTransferFromComponents,
      },
      { name: 'witness', type: 'bytes32' },
      { name: 'witnessTypeString', type: 'string' },
      { name: 'signature', type: 'bytes' },
    ],
  },
] as const satisfies AbiParameter[];
export type CreateAndDepositPayload = AbiParameterToPrimitiveType<
  (typeof CREATE_AND_DEPOSIT_ABI_PARAMS)[0]
>;

type ProvideEVMAccountSendCall = (
  dest: { axelarId: string; remoteAddress: EVMT['address'] },
  fee: DenomAmount,
  lca: LocalAccount,
  gmpChain: Chain<{ chainId: string }>,
  gmpAddresses: GmpAddresses,
  opts?: OrchestrationOptions,
) => Promise<unknown>;

type ProvideEVMAccountSendCallFactory = (
  sendCallArg?: unknown,
) => ProvideEVMAccountSendCall;

// Shared "provide pattern" with a pluggable GMP call, so we can reuse the
// reservation/resolve/error-handling logic across account-creation variants.
const makeProvideEVMAccount = ({
  getSendCall,
  txType,
  traceLabel,
}: {
  getSendCall: ProvideEVMAccountSendCallFactory;
  txType: TxType;
  traceLabel: string;
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
    opts?: OrchestrationOptions,
    sendCallArg?: unknown,
  ): GMPAccountStatus => {
  const sendCall = getSendCall(sendCallArg);
  const pId = pk.reader.getPortfolioId();
  const traceChain = trace.sub(`portfolio${pId}`).sub(chainName);

  const predictAddress = (owner: Bech32Address) => {
    const contracts = ctx.contracts[chainName];
    const remoteAddress = predictWalletAddress({
      owner,
      factoryAddress: contracts.factory,
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

  const evmAccount =
    reserve.state === 'new'
      ? predictAddress(lca.getAddress().value)
      : pk.reader.getGMPInfo(chainName);

  if (['pending', 'ok'].includes(reserve.state)) {
    return { ...evmAccount, ready: reserve.ready as unknown as Promise<void> };
  }

  if (reserve.state === 'new') {
    pk.manager.initAccountInfo(evmAccount);
  }

  const installContract = async () => {
    let txId: TxId | undefined;
    await null;
    try {
      const axelarId = ctx.axelarIds[chainName];
      const target = {
        axelarId,
        remoteAddress: ctx.contracts[chainName].factory,
      };
      const fee = { denom: ctx.gmpFeeInfo.denom, value: gmp.fee };
      fee.value > 0n || Fail`axelar makeAccount requires > 0 fee`;
      const feeAccount = await ctx.contractAccount;
      const src = feeAccount.getAddress();
      traceChain('send makeAccountCall Axelar fee from', src.value);
      await feeAccount.send(lca.getAddress(), fee, ...optsArgs);

      const watchTx = ctx.resolverClient.registerTransaction(
        txType,
        `${evmAccount.chainId}:${target.remoteAddress}`,
        undefined,
        evmAccount.remoteAddress,
      );
      txId = watchTx.txId;
      const result = watchTx.result as unknown as Promise<void>; // XXX host/guest;
      result.catch(err => {
        trace(txId, 'rejected', err);
      });

      await sendCall(
        target,
        fee,
        lca,
        gmp.chain,
        ctx.gmpAddresses,
        ...optsArgs,
      );

      traceChain('await', traceLabel, txId);
      await result;

      pk.manager.resolveAccount(evmAccount);
    } catch (reason) {
      traceChain('failed to', traceLabel, reason);
      pk.manager.releaseAccount(chainName, reason);
      if (txId) {
        ctx.resolverClient.unsubscribe(txId, `unsubscribe: ${reason}`);
      }
    }
  };
  void installContract();

  return {
    ...evmAccount,
    ready: reserve.ready as unknown as Promise<void>, // XXX host/guest
  };
  };
};


type TokenMessengerI = {
  depositForBurn: ['uint256', 'uint32', 'bytes32', 'address'];
};

/**
 * @see {@link https://github.com/circlefin/evm-cctp-contracts/blob/master/src/TokenMessenger.sol}
 * 1ddc505 Dec 2022
 */
const TokenMessenger: TokenMessengerI = {
  depositForBurn: ['uint256', 'uint32', 'bytes32', 'address'],
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

    const session = makeEVMSession();
    const usdc = session.makeContract(addresses.usdc, ERC20);
    const tm = session.makeContract(addresses.tokenMessenger, TokenMessenger);
    usdc.approve(addresses.tokenMessenger, amount.value);
    tm.depositForBurn(amount.value, nobleDomain, mintRecipient, addresses.usdc);
    const calls = session.finish();

    const { result } = ctx.resolverClient.registerTransaction(
      TxType.CCTP_TO_AGORIC,
      coerceAccountId(dest.lca.getAddress()),
      amount.value,
    );

    await sendGMPContractCall(ctx, src, calls, ...optsArgs);
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

    const { result } = ctx.resolverClient.registerTransaction(
      TxType.CCTP_TO_EVM,
      destinationAddress,
      amount.value,
    );
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
 * Invoke EVM Wallet Factory contract to create a remote account
 * at a predicatble address.
 *
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/c3305c4/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol#L137-L150 Factory.sol (_execute method)}
 *
 * The factory contract:
 * 1. Creates the smart wallet: `createSmartWallet(sourceAddress)`
 * 2. Emits a SmartWalletCreated event.
 */
export const sendMakeAccountCall = async (
  dest: { axelarId: string; remoteAddress: EVMT['address'] },
  fee: DenomAmount,
  lca: LocalAccount,
  gmpChain: Chain<{ chainId: string }>,
  gmpAddresses: GmpAddresses,
  ...optsArgs: [OrchestrationOptions?]
) => {
  const { AXELAR_GMP, AXELAR_GAS } = gmpAddresses;
  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: dest.axelarId,
    destination_address: dest.remoteAddress,
    payload: [],
    type: AxelarGMPMessageType.ContractCall,
    fee: { amount: String(fee.value), recipient: AXELAR_GAS },
  };
  const { chainId } = await gmpChain.getChainInfo();

  const gmp = { chainId, value: AXELAR_GMP, encoding: 'bech32' as const };
  return lca.transfer(gmp, fee, {
    ...optsArgs[0],
    memo: JSON.stringify(memo),
  });
};

export const provideEVMAccount = makeProvideEVMAccount({
  getSendCall: () => sendMakeAccountCall,
  txType: TxType.MAKE_ACCOUNT,
  traceLabel: 'makeAccount',
});

/**
 * Send a GMP call that creates a smart wallet and deposits funds via Permit2.
 */
export const sendCreateAndDepositCall = async (
  dest: { axelarId: string; remoteAddress: EVMT['address'] },
  fee: DenomAmount,
  permit2Payload: PermitDetails['permit2Payload'],
  lca: LocalAccount,
  gmpChain: Chain<{ chainId: string }>,
  gmpAddresses: GmpAddresses,
  opts?: OrchestrationOptions,
) => {
  // XXX: This encodes the payload directly; consider refactoring evm-facade
  // to use viem session tooling for contract call construction.
  const lcaOwner = lca.getAddress().value;
  const {
    owner: tokenOwner,
    permit,
    signature,
    witness,
    witnessTypeString,
  } = permit2Payload;

  const abiEncodedData = encodeAbiParameters(CREATE_AND_DEPOSIT_ABI_PARAMS, [
    {
      lcaOwner,
      tokenOwner,
      permit,
      signature,
      witness,
      witnessTypeString,
    },
  ]);

  const { AXELAR_GMP, AXELAR_GAS } = gmpAddresses;
  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: dest.axelarId,
    destination_address: dest.remoteAddress,
    payload: Array.from(hexToBytes(abiEncodedData.slice(2))),
    type: AxelarGMPMessageType.ContractCall,
    fee: { amount: String(fee.value), recipient: AXELAR_GAS },
  };
  const { chainId } = await gmpChain.getChainInfo();
  const gmp = { chainId, value: AXELAR_GMP, encoding: 'bech32' as const };
  return lca.transfer(gmp, fee, {
    ...opts,
    memo: JSON.stringify(memo),
  });
};

const makeSendCreateAndDepositCall = (
  permit2Payload: PermitDetails['permit2Payload'],
): ProvideEVMAccountSendCall => {
  return (dest, fee, lca, gmpChain, gmpAddresses, opts) =>
    sendCreateAndDepositCall(
      dest,
      fee,
      permit2Payload,
      lca,
      gmpChain,
      gmpAddresses,
      opts,
    );
};

const provideEVMAccountWithPermitBase = makeProvideEVMAccount({
  getSendCall: makeSendCreateAndDepositCall,
  txType: TxType.MAKE_ACCOUNT,
  traceLabel: 'createAndDeposit',
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
  opts?: OrchestrationOptions,
): GMPAccountStatus =>
  provideEVMAccountWithPermitBase(
    chainName,
    chainInfo,
    gmp,
    lca,
    ctx,
    pk,
    opts,
    permit2Payload,
  );

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
};

type AaveI = {
  supply: ['address', 'uint256', 'address', 'uint16'];
  withdraw: ['address', 'uint256', 'address'];
};

const Aave: AaveI = {
  supply: ['address', 'uint256', 'address', 'uint16'],
  withdraw: ['address', 'uint256', 'address'],
};

/**
 * see {@link https://github.com/aave/aave-v3-periphery/blob/master/contracts/rewards/RewardsController.sol }
 * 8f3380d Aug 2023
 */
type AaveRewardsControllerI = {
  claimAllRewardsToSelf: ['address[]'];
};

const AaveRewardsController: AaveRewardsControllerI = {
  claimAllRewardsToSelf: ['address[]'],
};

export const AaveProtocol = {
  protocol: 'Aave',
  chains: keys(AxelarChain) as AxelarChain[],
  supply: async (ctx, amount, src, ...optsArgs) => {
    const { remoteAddress } = src;
    const { addresses: a } = ctx;

    const session = makeEVMSession();
    const usdc = session.makeContract(a.usdc, ERC20);
    const aave = session.makeContract(a.aavePool, Aave);
    usdc.approve(a.aavePool, amount.value);
    aave.supply(a.usdc, amount.value, remoteAddress, 0);
    const calls = session.finish();

    return sendGMPContractCall(ctx, src, calls, ...optsArgs);
  },
  withdraw: async (ctx, amount, dest, claim, ...optsArgs) => {
    const { remoteAddress } = dest;
    const { addresses: a } = ctx;

    const session = makeEVMSession();
    if (claim) {
      const aaveRewardsController = session.makeContract(
        a.aaveRewardsController,
        AaveRewardsController,
      );
      aaveRewardsController.claimAllRewardsToSelf([a.aaveUSDC]);
    }
    const aave = session.makeContract(a.aavePool, Aave);
    aave.withdraw(a.usdc, amount.value, remoteAddress);
    const calls = session.finish();

    return sendGMPContractCall(ctx, dest, calls, ...optsArgs);
  },
} as const satisfies ProtocolDetail<'Aave', AxelarChain, EVMContext>;

type CompoundI = {
  supply: ['address', 'uint256'];
  withdraw: ['address', 'uint256'];
};

const Compound: CompoundI = {
  supply: ['address', 'uint256'],
  withdraw: ['address', 'uint256'],
};

/**
 * see {@link https://github.com/compound-finance/comet/blob/main/contracts/CometRewards.sol }
 * d7b414d May 2023
 */
type CompoundRewardsControllerI = {
  claim: ['address', 'address', 'bool'];
};

const CompoundRewardsController: CompoundRewardsControllerI = {
  claim: ['address', 'address', 'bool'],
};

export const CompoundProtocol = {
  protocol: 'Compound',
  chains: keys(AxelarChain) as AxelarChain[],
  supply: async (ctx, amount, src, ...optsArgs) => {
    const { addresses: a } = ctx;
    const session = makeEVMSession();
    const usdc = session.makeContract(a.usdc, ERC20);
    const compound = session.makeContract(a.compound, Compound);
    usdc.approve(a.compound, amount.value);
    compound.supply(a.usdc, amount.value);
    const calls = session.finish();

    return sendGMPContractCall(ctx, src, calls, ...optsArgs);
  },
  withdraw: async (ctx, amount, dest, claim, ...optsArgs) => {
    const { addresses: a } = ctx;
    const session = makeEVMSession();
    if (claim) {
      const compoundRewardsController = session.makeContract(
        a.compoundRewardsController,
        CompoundRewardsController,
      );
      compoundRewardsController.claim(a.compound, dest.remoteAddress, true);
    }
    const compound = session.makeContract(a.compound, Compound);
    compound.withdraw(a.usdc, amount.value);
    const calls = session.finish();

    return sendGMPContractCall(ctx, dest, calls, ...optsArgs);
  },
} as const satisfies ProtocolDetail<'Compound', AxelarChain, EVMContext>;

/**
 * see {@link https://github.com/beefyfinance/beefy-contracts/blob/master/contracts/BIFI/vaults/BeefyVaultV7.sol }
 * 0878a68 Nov 2022
 */
type BeefyVaultI = {
  deposit: ['uint256'];
  withdraw: ['uint256'];
};

const BeefyVault: BeefyVaultI = {
  deposit: ['uint256'],
  withdraw: ['uint256'],
};

export const BeefyProtocol = {
  protocol: 'Beefy',
  chains: keys(AxelarChain) as AxelarChain[],
  supply: async (ctx, amount, src, ...optsArgs) => {
    const { addresses: a, poolKey } = ctx;
    const session = makeEVMSession();
    const usdc = session.makeContract(a.usdc, ERC20);
    const vaultAddress =
      a[poolKey] ||
      assert.fail(X`Beefy pool key ${q(poolKey)} not found in addresses`);
    const vault = session.makeContract(vaultAddress, BeefyVault);
    usdc.approve(vaultAddress, amount.value);
    vault.deposit(amount.value);
    const calls = session.finish();

    return sendGMPContractCall(ctx, src, calls, ...optsArgs);
  },
  withdraw: async (ctx, amount, dest, _claim, ...optsArgs) => {
    const { addresses: a, poolKey } = ctx;
    const session = makeEVMSession();
    const vaultAddress =
      a[poolKey] ||
      assert.fail(X`Beefy pool key ${q(poolKey)} not found in addresses`);
    const vault = session.makeContract(vaultAddress, BeefyVault);
    vault.withdraw(amount.value);
    const calls = session.finish();

    return sendGMPContractCall(ctx, dest, calls, ...optsArgs);
  },
} as const satisfies ProtocolDetail<
  'Beefy',
  AxelarChain,
  EVMContext & { poolKey: PoolKey }
>;

/**
 * see {@link https://eips.ethereum.org/EIPS/eip-4626 }
 * ERC-4626: Tokenized Vault Standard
 */
type ERC4626I = {
  deposit: ['uint256', 'address'];
  withdraw: ['uint256', 'address', 'address'];
};

const ERC4626: ERC4626I = {
  deposit: ['uint256', 'address'],
  withdraw: ['uint256', 'address', 'address'],
};

export const ERC4626Protocol = {
  protocol: 'ERC4626',
  chains: keys(AxelarChain) as AxelarChain[],
  supply: async (ctx, amount, src, ...optsArgs) => {
    const { addresses: a, poolKey } = ctx;
    const { remoteAddress } = src;
    const session = makeEVMSession();
    const usdc = session.makeContract(a.usdc, ERC20);
    const vaultAddress =
      a[poolKey] ||
      assert.fail(X`ERC4626 pool key ${q(poolKey)} not found in addresses`);
    const vault = session.makeContract(vaultAddress, ERC4626);
    usdc.approve(vaultAddress, amount.value);
    vault.deposit(amount.value, remoteAddress);
    const calls = session.finish();

    await sendGMPContractCall(ctx, src, calls, ...optsArgs);
  },
  withdraw: async (ctx, amount, dest, _claim, ...optsArgs) => {
    const { addresses: a, poolKey } = ctx;
    const { remoteAddress } = dest;
    const session = makeEVMSession();
    const vaultAddress =
      a[poolKey] ||
      assert.fail(X`ERC4626 pool key ${q(poolKey)} not found in addresses`);
    const vault = session.makeContract(vaultAddress, ERC4626);
    vault.withdraw(amount.value, remoteAddress, remoteAddress);
    const calls = session.finish();

    await sendGMPContractCall(ctx, dest, calls, ...optsArgs);
  },
} as const satisfies ProtocolDetail<
  'ERC4626',
  AxelarChain,
  EVMContext & { poolKey: PoolKey }
>;
