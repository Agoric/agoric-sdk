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
import {
  coerceAccountId,
  sameEvmAddress,
} from '@agoric/orchestration/src/utils/address.js';
import { constructContractCall } from '@agoric/orchestration/src/utils/gmp.js';
import { PermitWitnessTransferFromFunctionABIType } from '@agoric/orchestration/src/utils/permit2.js';
import { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import type { PermitDetails } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import { Fail, makeError, q } from '@endo/errors';
import type { PureData } from '@endo/pass-style';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { makeEvmContract } from './evm-facade.ts';
import {
  remoteAccountAxelarRouterABI,
  type RouterOperationPayload,
  type SupportedOperations,
  type ProvideRemoteAccountInstruction,
} from './interfaces/orch-router.ts';
import type { EVMContractAddresses } from './portfolio.contract.ts';
import type { GMPAccountInfo, PortfolioKit } from './portfolio.exo.ts';
import {
  type LocalAccount,
  type PortfolioInstanceContext,
} from './portfolio.flows.ts';
import {
  TxType,
  type PublishedRoutedGMPTxDetails,
} from './resolver/constants.js';
import {
  padTxId,
  predictRemoteAccountAddress,
} from './utils/evm-orch-router.ts';
import { appendTxIds } from './utils/traffic.ts';
import type { EVMContext } from './pos-evm.flows.ts';

const trace = makeTracer('GMPRF');

export type GMPAccountStatus = GMPAccountInfo & {
  /** created and ready to accept GMP messages */
  ready: Promise<unknown>;
  /** completely finished the makeAccount/createAndDeposit transaction */
  done: Promise<unknown>;
};

const gmpRouterContract = makeEvmContract(remoteAccountAxelarRouterABI);

export const sendGMPRouterInstruction = async <T extends SupportedOperations>(
  ctx: Omit<EVMContext, 'feeAccount'> & {
    feeAccount: EVMContext['feeAccount'] | Promise<EVMContext['feeAccount']>;
    progressTracker: ProgressTracker;
    remoteAccount: GMPAccountInfo;
    trace?: ReturnType<typeof makeTracer>;
  },
  payload: RouterOperationPayload<T> & {
    sendFromContract?: boolean;
    debuggingDetails?: Record<string, PureData>;
  },
) => {
  const {
    feeAccount,
    lca,
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
    routerFactory,
    remoteAddress,
    chainId: remoteChainId,
  } = remoteAccount;
  const axelarId = axelarIds[chainName];

  const { sendFromContract = false, debuggingDetails = {} } = payload;

  if (
    !routerFactory ||
    !sameEvmAddress(routerFactory, addresses.remoteAccountFactory)
  ) {
    Fail`Remote account ${remoteAddress} on ${chainName} was not deployed by a supported factory for router-based accounts. Expected factory at ${addresses.remoteAccountFactory}, got ${routerFactory}`;
  }

  assert(addresses.remoteAccountRouter && addresses.remoteAccountFactory);

  const contractAccount = await feeAccount;

  const destinationAddress =
    `${remoteChainId}:${addresses.remoteAccountRouter}` as const;

  const sourceAccount = sendFromContract ? contractAccount : lca;
  const sourceAddress = coerceAccountId(sourceAccount.getAddress());

  const watchTx = resolverClient.createPendingTx({
    type: TxType.ROUTED_GMP,
    destinationAddress,
    sourceAddress,
    incomplete: true,
  });
  const txId = watchTx.txId;
  const resultP = watchTx.result as unknown as Promise<void>; // XXX host/guest;

  const result = ctx.trace
    ? resultP.catch(err => {
        ctx.trace!(txId, 'rejected', err);
        throw err;
      })
    : resultP;

  try {
    appendTxIds(progressTracker, [txId]);

    // We should never get here if router config is invalid
    const { remoteAccountFactory } = addresses;
    assert(remoteAccountFactory);

    // The router enforces that expectedRemoteTargetAddress matches the sourceAccount.
    // For messages sent from the contract account, this is the factory address.
    const expectedRemoteTargetAddress = sendFromContract
      ? remoteAccountFactory
      : remoteAddress;

    const { instruction, instructionType } =
      payload as RouterOperationPayload<SupportedOperations>;

    const functionName = `process${instructionType}Instruction` as const;
    const encodedPayloadHex = gmpRouterContract[functionName](
      padTxId(txId, sourceAccount.getAddress().value),
      expectedRemoteTargetAddress,
      // @ts-expect-error something with union of callables/args
      instruction,
    );
    const encodedPayload = hexToBytes(encodedPayloadHex.slice(2));
    const payloadHash = `0x${bytesToHex(keccak256(encodedPayload))}` as const;

    resolverClient.updateTxMeta(
      txId,
      harden({
        type: TxType.ROUTED_GMP,
        destinationAddress,
        sourceAddress,
        payloadHash,
        details: {
          instructionSelector: encodedPayloadHex.slice(0, 10) as `0x${string}`,
          instructionType,
          expectedRemoteTargetAddress,
          // Currently messages sent from the contract account are in relation
          // to a remote account (more specifically account creation with deposit).
          // We capture the details of that remote account for debugging.
          ...(sendFromContract
            ? {
                principalAccount: lca.getAddress().value,
                remoteAccountAddress: remoteAddress,
              }
            : {}),
          ...debuggingDetails,
        },
      } satisfies PublishedRoutedGMPTxDetails),
    );

    const { AXELAR_GMP, AXELAR_GAS } = gmpAddresses;
    const memo: AxelarGmpOutgoingMemo = {
      destination_chain: axelarId,
      destination_address: addresses.remoteAccountRouter,
      payload: Array.from(encodedPayload),
      type: AxelarGMPMessageType.ContractCall,
      fee: { amount: String(gmpFee.value), recipient: AXELAR_GAS },
    };
    const { chainId } = await gmpChain.getChainInfo();

    const gmp = {
      chainId,
      value: AXELAR_GMP,
      encoding: 'bech32' as const,
    };
    ctx.trace?.('send routed gmp', txId);
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
    result.catch(() => {});
    resolverClient.unsubscribe(txId, `unsubscribe: ${reason}`);
    throw reason;
  }

  ctx.trace?.('awaiting routed gmp', txId);
  await result;
};

const predictAccountInfo = (
  ctx: {
    addresses: EVMContractAddresses;
    chainName: AxelarChain;
    chainInfo: BaseChainInfo;
    trace?: ReturnType<typeof makeTracer>;
  },
  owner: Bech32Address,
) => {
  const {
    remoteAccountImplementation: implementationAddress,
    remoteAccountFactory: factoryAddress,
    remoteAccountRouter: routerAddress,
  } = ctx.addresses;
  ctx.trace?.(
    'router factory',
    factoryAddress,
    'for implementation',
    implementationAddress,
  );
  assert(factoryAddress && implementationAddress && routerAddress);
  const remoteAddress = predictRemoteAccountAddress({
    owner,
    factoryAddress,
    implementationAddress,
  });
  const info: GMPAccountInfo = {
    namespace: 'eip155',
    chainName: ctx.chainName,
    chainId: `${ctx.chainInfo.namespace}:${ctx.chainInfo.reference}`,
    remoteAddress,
    routerFactory: factoryAddress,
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
    ctx: Omit<EVMContext, 'feeAccount'> & {
      feeAccount: Promise<EVMContext['feeAccount']> | EVMContext['feeAccount'];
      chainName: AxelarChain;
      chainInfo: BaseChainInfo;
      pk: GuestInterface<PortfolioKit>;
      progressTracker: ProgressTracker;
    },
    {
      permit2Payload,
    }: {
      permit2Payload?: PermitDetails['permit2Payload'];
    } = {},
  ): GMPAccountStatus => {
    const { pk, chainName, lca, gmpFee } = ctx;

    const pId = pk.reader.getPortfolioId();
    const traceChain = trace.sub(`portfolio${pId}`).sub(chainName);

    const reserve = pk.manager.reserveAccountState(chainName);
    const readyP = reserve.ready as unknown as Promise<void>; // XXX host/guest

    // Only use the account manager if we're responsible for resolving the account info.
    const isNewAccount = reserve.state === 'new';
    const manager =
      isNewAccount || reserve.state === 'failed' ? pk.manager : undefined;

    const handleFail = (reason: unknown) => {
      traceChain('failed to make account', reason);
      manager?.releaseAccount(chainName, reason);
    };

    try {
      const principalAccount = lca.getAddress().value;
      const evmAccount = isNewAccount
        ? predictAccountInfo({ ...ctx, trace: traceChain }, principalAccount)
        : pk.reader.getGMPInfo(chainName);

      // In the case of an account that previously failed to be created,
      // we are not currently able to recover. Too many code paths assume the
      // account details are immutable.
      // Our caller should never have gotten us here in the first place.
      assert(evmAccount.routerFactory);

      // Bail out early if another caller created the account, and this is not a deposit.
      if (!manager && !permit2Payload) {
        return {
          ...evmAccount,
          ready: readyP,
          done: readyP,
        };
      }

      if (isNewAccount) {
        manager!.initAccountInfo(evmAccount);
      } else {
        const expectedAddress = predictAccountInfo(
          { ...ctx, trace: traceChain },
          principalAccount,
        ).remoteAddress;

        if (!sameEvmAddress(evmAccount.remoteAddress, expectedAddress)) {
          const reason = makeError(
            `account already exists at ${evmAccount.remoteAddress}, factory expects ${expectedAddress}`,
          );
          const done = Promise.reject(reason);
          handleFail(reason);

          return {
            ...evmAccount,
            ready: readyP,
            done,
          };
        }
      }

      const payload = {
        ...(permit2Payload
          ? ({
              instructionType: 'ProvideRemoteAccount',
              instruction: {
                depositPermit: [permit2Payload],
                expectedAccountAddress: evmAccount.remoteAddress,
                principalAccount,
              } satisfies ProvideRemoteAccountInstruction,
              sendFromContract: true,
              debuggingDetails: {
                depositFrom: permit2Payload.owner,
                depositAmount: permit2Payload.permit.permitted.amount,
              },
            } as const)
          : ({
              instructionType: 'RemoteAccountExecute',
              instruction: {
                multiCalls: [],
              },
              debuggingDetails: {
                stepType: 'ProvideRemoteAccount',
              },
            } as const)),
      };

      const send = async () => {
        await null;
        try {
          gmpFee.value > 0n || Fail`axelar makeAccount requires > 0 fee`;

          await sendGMP(
            {
              ...ctx,
              remoteAccount: evmAccount,
              trace: traceChain,
            },
            payload,
          );
          manager?.resolveAccount(evmAccount);
        } catch (reason) {
          handleFail(reason);
          throw reason;
        }
        await readyP;
      };

      const done = send();
      return {
        ...evmAccount,
        ready: readyP,
        done,
      };
    } catch (reason) {
      handleFail(reason);
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
  permit2Payload?: PermitDetails['permit2Payload'],
  orchOpts?: OrchestrationOptions,
): GMPAccountStatus => {
  const {
    axelarIds,
    contracts,
    contractAccount: feeAccount,
    gmpAddresses,
    gmpFeeInfo,
    resolverClient,
  } = ctx;

  const addresses = contracts[chainName];

  const fee = { denom: gmpFeeInfo.denom, value: gmp.fee };

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
    lca,
    pk,
    progressTracker,
    nobleForwardingChannel: ctx.transferChannels.noble.counterPartyChannelId,
  } as const satisfies ProvideEVMAccountContext;

  return provideEVMRoutedAccount(newCtx, {
    permit2Payload,
  });
};

export const provideEVMAccount = (
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
): GMPAccountStatus =>
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
      instructionType: 'RemoteAccountExecute',
      instruction: {
        multiCalls: calls.map(callData => ({
          ...constructContractCall(callData),
          value: 0n,
          gasLimit: 0n,
        })),
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
      instructionType: 'RemoteAccountExecute',
      instruction: {
        multiCalls: [
          {
            target: addresses.permit2,
            data: encodedCall,
            value: 0n,
            gasLimit: 0n,
          },
        ],
      },
      debuggingDetails: {
        depositFrom: owner,
        depositAmount: transferAmount,
      },
    },
  );
};
