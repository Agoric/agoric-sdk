/**
 * @file flows for interacting with legacy Wallet contracts on EVM chains
 *
 * @see {@link provideEVMAccount}
 * @see {@link makeAccount}
 * @see {@link sendGMPContractCall}
 */
import type { GuestInterface } from '@agoric/async-flow';
import type { NatValue } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import type {
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
import { PermitWitnessTransferFromInputComponents } from '@agoric/orchestration/src/utils/permit2.ts';
import { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import type { PermitDetails } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import { Fail, q } from '@endo/errors';
import { hexToBytes } from '@noble/hashes/utils';
import type { Address } from 'viem';
import { makeEvmAbiCallBatch, makeGmpBuilder } from './evm-facade.ts';
import { depositFactoryABI, factoryABI } from './interfaces/orch-factory.ts';
import type { GmpAddresses } from './portfolio.contract.ts';
import type { GMPAccountInfo, PortfolioKit } from './portfolio.exo.ts';
import {
  type LocalAccount,
  type PortfolioInstanceContext,
} from './portfolio.flows.ts';
import { TxType } from './resolver/constants.js';
import type { TxId } from './resolver/types.ts';
import { predictWalletAddress } from './utils/evm-orch-factory.ts';
import { appendTxIds } from './utils/traffic.ts';
import type { EVMContext } from './pos-evm.flows.ts';

const trace = makeTracer('GMPF');

export type GMPAccountStatus = GMPAccountInfo & {
  /** created and ready to accept GMP messages */
  ready: Promise<unknown>;
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
  return async (
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
  ): Promise<GMPAccountStatus> => {
    // sendCall is either sendMakeAccountCall or sendCreateAndDepositCall
    const sendCall = getSendCall(opts.sendCallArg);
    const pId = pk.reader.getPortfolioId();
    const traceChain = trace.sub(`portfolio${pId}`).sub(chainName);

    const predictAddress = (owner: Bech32Address) => {
      const contracts = ctx.contracts[chainName];
      const factoryAddress = contracts.factory;
      traceChain('factory', mode, factoryAddress);
      assert(factoryAddress);
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

    const evmAccount =
      reserve.state === 'new'
        ? predictAddress(lca.getAddress().value)
        : pk.reader.getGMPInfo(chainName);

    if (['pending', 'ok'].includes(reserve.state)) {
      return {
        ...evmAccount,
        ready: reserve.ready as unknown as Promise<void>,
      };
    }

    if (reserve.state === 'new') {
      pk.manager.initAccountInfo(evmAccount);
    }

    const installContract = async () => {
      let txId: TxId | undefined;
      await null;
      try {
        const axelarId = ctx.axelarIds[chainName];
        const fee = { denom: ctx.gmpFeeInfo.denom, value: gmp.fee };
        fee.value > 0n || Fail`axelar makeAccount requires > 0 fee`;

        const contractAccount = await ctx.contractAccount;

        const src = contractAccount.getAddress();
        traceChain('Axelar fee sent from', src.value);

        const contracts = ctx.contracts[chainName];

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
          contracts.factory,
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

        pk.manager.resolveAccount(evmAccount);
      } catch (reason) {
        traceChain('failed to', mode, reason);
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
): Promise<GMPAccountStatus> =>
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
