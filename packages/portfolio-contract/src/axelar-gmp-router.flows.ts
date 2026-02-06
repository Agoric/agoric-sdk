/**
 * @file flows for interacting with router-based remote account contracts on EVM chains
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
  OrchestrationOptions,
  ProgressTracker,
} from '@agoric/orchestration';
import {
  AxelarGMPMessageType,
  type AxelarGmpOutgoingMemo,
  type ContractCall,
} from '@agoric/orchestration/src/axelar-types.js';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import { constructContractCall } from '@agoric/orchestration/src/utils/gmp.js';
import { PermitWitnessTransferFromFunctionABIType } from '@agoric/orchestration/src/utils/permit2.ts';
import { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import type { PermitDetails } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import { Fail, q } from '@endo/errors';
import { hexToBytes } from '@noble/hashes/utils';
import { makeEvmContract } from './evm-facade.ts';
import {
  remoteAccountAxelarRouterABI,
  type RouterOperationPayload,
  type SupportedOperations,
  type DepositInstruction,
} from './interfaces/orch-router.ts';
import type { EVMContractAddresses } from './portfolio.contract.ts';
import type { GMPAccountInfo, PortfolioKit } from './portfolio.exo.ts';
import {
  type LocalAccount,
  type PortfolioInstanceContext,
} from './portfolio.flows.ts';
import { TxType } from './resolver/constants.js';
import {
  predictRemoteAccountAddress,
  toInitCodeHash,
} from './utils/evm-orch-router.ts';
import { appendTxIds } from './utils/traffic.ts';
import type { EVMContext } from './pos-evm.flows.ts';

const trace = makeTracer('GMPRF');

export type GMPAccountStatus = GMPAccountInfo & {
  /** created and ready to accept GMP messages */
  ready: Promise<unknown>;
};

const gmpRouterContract = makeEvmContract(remoteAccountAxelarRouterABI);

export const sendGMPRouterInstruction = async <T extends SupportedOperations>(
  ctx: EVMContext & {
    progressTracker: ProgressTracker;
    remoteAccount: GMPAccountInfo;
    trace?: ReturnType<typeof makeTracer>;
  },
  payload: RouterOperationPayload<T> & {
    txType?: TxType;
    ignoreNonCurrentRouter?: boolean;
  },
) => {
  const {
    feeAccount: contractAccount,
    lca: sourceAccount,
    gmpChain,
    gmpFee,
    gmpAddresses,
    addresses,
    resolverClient,
    axelarIds,
    remoteAccount,
    progressTracker,
  } = ctx;
  const {
    chainName,
    routerAddress,
    remoteAddress,
    chainId: remoteChainId,
    transferringFromRouter,
  } = remoteAccount;
  const axelarId = axelarIds[chainName];

  const { txType = TxType.GMP, ignoreNonCurrentRouter = false } = payload;

  if (!routerAddress) {
    throw Fail`Remote account ${remoteAddress} on ${chainName} is not a router-enabled account`;
  }

  if (
    !ignoreNonCurrentRouter &&
    routerAddress !== addresses.remoteAccountRouter
  ) {
    Fail`Remote account ${remoteAddress} on ${chainName} is not using the current router. Must transfer first.`;
  }

  !transferringFromRouter ||
    Fail`Remote account ${remoteAddress} on ${chainName} is currently transferring`;

  const sourceAddress = coerceAccountId(sourceAccount.getAddress());
  const { result, txId } = resolverClient.registerTransaction(
    txType,
    `${remoteChainId}:${routerAddress}`,
    undefined,
    remoteAddress,
    sourceAddress,
    addresses.remoteAccountFactory,
    true,
  );
  appendTxIds(progressTracker, [txId]);

  await null;
  try {
    const { instruction, instructionType } =
      payload as RouterOperationPayload<SupportedOperations>;

    const functionName = `process${instructionType}Instruction` as const;
    const encodedPayload = gmpRouterContract[functionName](
      txId,
      remoteAddress,
      // @ts-expect-error something with union of callables/args
      instruction,
    );

    const { AXELAR_GMP, AXELAR_GAS } = gmpAddresses;
    const memo: AxelarGmpOutgoingMemo = {
      destination_chain: axelarId,
      destination_address: routerAddress,
      payload: Array.from(hexToBytes(encodedPayload.slice(2))),
      type: AxelarGMPMessageType.ContractCall,
      fee: { amount: String(gmpFee.value), recipient: AXELAR_GAS },
    };
    const { chainId } = await gmpChain.getChainInfo();

    const gmp = {
      chainId,
      value: AXELAR_GMP,
      encoding: 'bech32' as const,
    };
    ctx.trace?.('send gmp', txType, txId);
    if (contractAccount !== sourceAccount) {
      await contractAccount.send(sourceAccount.getAddress(), gmpFee, {
        progressTracker,
      });
    }
    await sourceAccount.transfer(gmp, gmpFee, {
      progressTracker,
      memo: JSON.stringify(memo),
    });
  } catch (reason) {
    resolverClient.unsubscribe(txId, `unsubscribe: ${reason}`);
  }

  await result;
};

const predictAccountInfo = (
  ctx: {
    addresses: EVMContractAddresses;
    chainName: AxelarChain;
    chainInfo: BaseChainInfo;
    remoteAccountBytecodeHash: `0x${string}`;
    trace?: ReturnType<typeof makeTracer>;
  },
  owner: Bech32Address,
) => {
  const factoryAddress = ctx.addresses.remoteAccountFactory;
  ctx.trace?.('factory', factoryAddress);
  assert(factoryAddress);
  const remoteAddress = predictRemoteAccountAddress({
    owner,
    factoryAddress,
    remoteAccountInitCodeHash: toInitCodeHash(ctx.remoteAccountBytecodeHash),
  });
  const routerAddress = ctx.addresses.remoteAccountRouter;
  const info: GMPAccountInfo = {
    namespace: 'eip155',
    chainName: ctx.chainName,
    chainId: `${ctx.chainInfo.namespace}:${ctx.chainInfo.reference}`,
    remoteAddress,
    routerAddress,
  } satisfies GMPAccountInfo;
  ctx.trace?.(
    'CREATE2',
    remoteAddress,
    'for',
    owner,
    'with router',
    routerAddress,
  );
  return info;
};

export const makeProvideEVMAccount =
  (sendGMP: typeof sendGMPRouterInstruction) =>
  (
    ctx: EVMContext & {
      chainName: AxelarChain;
      chainInfo: BaseChainInfo;
      pk: GuestInterface<PortfolioKit>;
      progressTracker: ProgressTracker;
      remoteAccountBytecodeHash: `0x${string}`;
    },
    {
      permit2Payload,
    }: {
      permit2Payload?: PermitDetails['permit2Payload'];
    } = {},
  ): GMPAccountStatus => {
    const {
      pk,
      chainName,
      lca,
      feeAccount: contractAccount,
      gmpFee,
      addresses,
    } = ctx;

    const pId = pk.reader.getPortfolioId();
    const traceChain = trace.sub(`portfolio${pId}`).sub(chainName);

    const reserve = pk.manager.reserveAccountState(chainName);

    const isNew = reserve.state === 'new';
    const handleFail = (reason: unknown) => {
      traceChain('failed to make account', reason);
      if (isNew) {
        pk.manager.releaseAccount(chainName, reason);
      }
    };

    try {
      const principalAccount = lca.getAddress().value;
      const evmAccount = isNew
        ? predictAccountInfo({ ...ctx, trace: traceChain }, principalAccount)
        : pk.reader.getGMPInfo(chainName);

      if (['pending', 'ok'].includes(reserve.state)) {
        return {
          ...evmAccount,
          ready: reserve.ready as unknown as Promise<void>,
        };
      }

      gmpFee.value > 0n || Fail`axelar makeAccount requires > 0 fee`;

      if (isNew) {
        pk.manager.initAccountInfo(evmAccount);
      }

      // TODO: how to handle provide of failed account that was attempted
      // on deposit factory?

      const routerPayload = {
        txType: TxType.MAKE_ACCOUNT,
        ...(permit2Payload
          ? ({
              instructionType: 'Deposit',
              instruction: {
                depositPermit: [permit2Payload],
                expectedAccountAddress: evmAccount.remoteAddress,
                principalAccount,
              } satisfies DepositInstruction,
            } as const)
          : ({
              instructionType: 'RemoteAccount',
              instruction: {
                multiCalls: [],
              },
            } as const)),
      };

      const contractRemoteAccount: GMPAccountInfo = {
        namespace: 'eip155',
        chainName,
        chainId: evmAccount.chainId,
        remoteAddress: addresses.remoteAccountFactory,
        routerAddress: addresses.remoteAccountRouter,
      };

      const remoteAccount = permit2Payload ? contractRemoteAccount : evmAccount;
      const sourceAccount = permit2Payload ? contractAccount : lca;

      void sendGMP(
        {
          ...ctx,
          remoteAccount,
          lca: sourceAccount,
          trace: traceChain,
        },
        routerPayload,
      ).then(() => pk.manager.resolveAccount(evmAccount), handleFail);

      return {
        ...evmAccount,
        ready: reserve.ready as unknown as Promise<void>, // XXX host/guest
      };
    } catch (reason) {
      void handleFail(reason);
      throw reason;
    }
  };

type ProvideEVMAccountContext = Parameters<
  ReturnType<typeof makeProvideEVMAccount>
>[0];

// Legacy adapters

export const provideEVMRoutedAccount = makeProvideEVMAccount(
  sendGMPRouterInstruction,
);

export const provideEVMAccountWithPermit = async (
  chainName: AxelarChain,
  chainInfo: BaseChainInfo,
  gmp: {
    chain: Chain<{ chainId: string }>;
    fee: NatValue;
  },
  lca: LocalAccount,
  ctx: PortfolioInstanceContext,
  pk: GuestInterface<PortfolioKit>,
  permit2Payload?: PermitDetails['permit2Payload'],
  orchOpts?: OrchestrationOptions,
): Promise<GMPAccountStatus> => {
  const {
    axelarIds,
    contracts,
    contractAccount,
    gmpAddresses,
    gmpFeeInfo,
    remoteAccountBytecodeHash,
    resolverClient,
  } = ctx;

  const addresses = contracts[chainName];

  if (!remoteAccountBytecodeHash || !addresses.remoteAccountRouter) {
    trace('remote account config missing, are we replaying an old flow?');
    return new Promise(() => {}); // Tombstone
  }

  const fee = { denom: gmpFeeInfo.denom, value: gmp.fee };

  const feeAccount = await contractAccount;

  const { progressTracker } = orchOpts ?? {};
  assert(progressTracker);

  const newCtx = {
    addresses,
    axelarIds,
    chainInfo,
    chainName,
    feeAccount,
    gmpAddresses,
    gmpChain: gmp.chain,
    gmpFee: fee,
    resolverClient,
    remoteAccountBytecodeHash,
    lca,
    pk,
    progressTracker,
    nobleForwardingChannel: ctx.transferChannels.noble.counterPartyChannelId,
  } as const satisfies ProvideEVMAccountContext;

  return provideEVMRoutedAccount(newCtx, {
    permit2Payload,
  });
};

export const provideEVMAccount = async (
  chainName: AxelarChain,
  chainInfo: BaseChainInfo,
  gmp: {
    chain: Chain<{ chainId: string }>;
    fee: NatValue;
  },
  lca: LocalAccount,
  ctx: PortfolioInstanceContext,
  pk: GuestInterface<PortfolioKit>,
  opts: { orchOpts?: OrchestrationOptions } = {},
): Promise<GMPAccountStatus> =>
  provideEVMAccountWithPermit(
    chainName,
    chainInfo,
    gmp,
    lca,
    ctx,
    pk,
    undefined,
    opts.orchOpts,
  );

/**
 * Sends a GMP call to execute contract calls on a remote smart wallet.
 */
export const sendGMPContractCall = async (
  ctx: EVMContext,
  gmpAcct: GMPAccountInfo,
  calls: ContractCall[],
  ...optsArgs: [OrchestrationOptions?]
) => {
  const { progressTracker } = optsArgs[0] ?? {};
  assert(progressTracker);

  await sendGMPRouterInstruction(
    { ...ctx, remoteAccount: gmpAcct, progressTracker },
    {
      instructionType: 'RemoteAccount',
      instruction: {
        multiCalls: calls.map(callData => constructContractCall(callData)),
      },
    },
  );
};

const permit2Contract = makeEvmContract([
  PermitWitnessTransferFromFunctionABIType,
]);

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
  const { addresses } = ctx;
  const { progressTracker } = optsArgs[0] ?? {};
  assert(progressTracker);

  const { remoteAddress } = gmpAcct;

  const { permit, owner, witness, witnessTypeString, signature } =
    permit2Payload;

  transferAmount <= permit.permitted.amount ||
    Fail`insufficient permitted amount ${q(permit.permitted.amount)} for transferAmount ${q(transferAmount)}`;

  // Build the transferDetails - tokens go to the wallet
  const transferDetails = {
    to: remoteAddress,
    requestedAmount: transferAmount,
  };

  const encodedCall = permit2Contract.permitWitnessTransferFrom(
    permit,
    transferDetails,
    owner,
    witness,
    witnessTypeString,
    signature,
  );

  await sendGMPRouterInstruction(
    { ...ctx, remoteAccount: gmpAcct, progressTracker },
    {
      instructionType: 'RemoteAccount',
      instruction: {
        multiCalls: [
          {
            target: addresses.permit2,
            data: encodedCall,
          },
        ],
      },
    },
  );
};
