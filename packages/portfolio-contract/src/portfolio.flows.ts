/**
 * OrchestrationFlow functions for {@link portfolio.contract.ts}
 * @see {makeLocalAccount}
 * @see {openPortfolio}
 */
import type { GuestInterface } from '@agoric/async-flow';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { MsgLock } from '@agoric/cosmic-proto/noble/dollar/vaults/v1/tx.js';
import { MsgSwap } from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import type { Amount } from '@agoric/ertp';
import { makeTracer, mustMatch } from '@agoric/internal';
import { assert } from '@endo/errors';
import type {
  CosmosChainAddress,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
  AccountId,
} from '@agoric/orchestration';
import {
  AxelarGMPMessageType,
  type AxelarGmpOutgoingMemo,
} from '@agoric/orchestration/src/axelar-types.js';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { PortfolioKit } from './portfolio.exo.ts';
import {
  buildGMPPayload,
  gmpAddresses,
} from '@agoric/orchestration/src/utils/gmp.js';
import type {
  AxelarChain,
  BaseGmpArgs,
  GmpArgsContractCall,
  GmpArgsTransferAmount,
  GmpArgsWithdrawAmount,
  LocalAccount,
  OfferArgsFor,
  PortfolioBootstrapContext,
  PortfolioInstanceContext,
  ProposalType,
} from './type-guards.ts';
import { GMPArgsShape } from './type-guards.ts';
// TODO: import { VaultType } from '@agoric/cosmic-proto/dist/codegen/noble/dollar/vaults/v1/vaults';

const trace = makeTracer('PortF');
const { values } = Object;

/**
 * Make an orchestration account on the agoric chain to, for example,
 * initiate IBC token transfers.
 *
 * XXX TODO: currently shared among all clients, since funds are only
 * held momentarily.
 */
export const makeLocalAccount = (async (orch: Orchestrator, _ctx: unknown) => {
  const agoricChain = await orch.getChain('agoric');
  const account = (await agoricChain.makeAccount()) as OrchestrationAccount<{
    chainId: 'agoric-any';
  }>;

  return account;
}) satisfies OrchestrationFlow;
harden(makeLocalAccount);

// XXX: push down to Orchestration API in NobleMethods, in due course
const makeSwapLockMessages = (
  nobleAddr: CosmosChainAddress,
  amountValue: bigint,
  {
    poolId = 0n,
    denom = 'uusdc',
    denomTo = 'uusdn',
    vault = 1, // VaultType.STAKED,
  } = {},
) => {
  const amount = `${amountValue}`;
  const msgSwap: MsgSwap = {
    signer: nobleAddr.value,
    amount: { denom, amount },
    routes: [{ poolId, denomTo }],
    // TODO: swap min multiplier?
    min: { denom: denomTo, amount },
  };
  const msgLock: MsgLock = {
    signer: nobleAddr.value,
    vault,
    // TODO: swap multiplier
    amount,
  };
  return { msgSwap, msgLock };
};

const initRemoteEVMAccount = async (
  orch,
  seat,
  ctx: PortfolioInstanceContext,
  gmpArgs: BaseGmpArgs,
  keeper: GuestInterface<PortfolioKit['keeper']>,
) => {
  const { axelarChainsMap, contractAddresses, inertSubscriber } = ctx;
  const { destinationEVMChain, gasAmount } = gmpArgs;

  await sendGmp(
    orch,
    seat,
    ctx,
    harden({
      destinationAddress: contractAddresses.factory,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      gasAmount,
      contractInvocationData: [],
    }),
    keeper,
  );

  const addr = await keeper.getGMPAddress();
  const caipChainId = axelarChainsMap[destinationEVMChain].caip;
  const accountId: AccountId = `${caipChainId}:${addr}`;

  const topic: GuestInterface<ResolvedPublicTopic<unknown>> = {
    description: `EVM Addr`,
    subscriber: inertSubscriber,
    storagePath: accountId,
  };
  return topic;
};

const sendTokensViaCCTP = async (
  orch,
  seat,
  ctx: PortfolioInstanceContext,
  args: {
    amount: Amount<'nat'>;
    destinationEVMChain: AxelarChain;
  },
  keeper: GuestInterface<PortfolioKit>['keeper'],
) => {
  const { axelarChainsMap, chainHubTools, zoeTools } = ctx;
  const { amount, destinationEVMChain } = args;
  const nobleChain = await orch.getChain('noble');
  const nobleAccount = await nobleChain.makeAccount();

  const localAcct = await keeper.getLCA();
  const amounts = harden({ Aave: amount });
  trace('localTransfer', amount, 'to local', localAcct.getAddress().value);
  // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
  await zoeTools.localTransfer(seat, localAcct, amounts);

  try {
    await localAcct.transfer(nobleAccount.getAddress(), amount);

    const denom = await chainHubTools.getDenom(amount.brand);
    assert(denom, 'denom must be defined');
    const denomAmount = {
      denom,
      value: amount.value,
    };

    const caipChainId = axelarChainsMap[destinationEVMChain].caip;
    const remoteAccountAddress = await keeper.getGMPAddress();
    const destinationAddress = `${caipChainId}:${remoteAccountAddress}`;
    trace(`destinationAddress: ${destinationAddress}`);
    await nobleAccount.depositForBurn(
      destinationAddress as `${string}:${string}:${string}`,
      denomAmount,
    );
  } catch (err) {
    // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
    await zoeTools.withdrawToSeat(localAcct, seat, amounts);
    const errorMsg = `'Noble transfer failed: ${err}`;
    throw new Error(errorMsg);
  }
};

const bigintReplacer = (_, v) => (typeof v === 'bigint' ? `${v}` : v);

const sendGmp = async (
  orch: Orchestrator,
  seat: ZCFSeat,
  ctx: PortfolioInstanceContext,
  gmpArgs: GmpArgsContractCall,
  keeper: GuestInterface<PortfolioKit>['keeper'],
) => {
  mustMatch(gmpArgs, GMPArgsShape);
  const {
    destinationAddress,
    type,
    destinationEVMChain,
    gasAmount,
    contractInvocationData,
  } = gmpArgs;
  const { axelarChainsMap, chainHubTools, zoeTools } = ctx;

  const payload = buildGMPPayload(contractInvocationData);
  trace(`Payload: ${JSON.stringify(payload)}`);

  const axelar = await orch.getChain('axelar');
  const { chainId } = await axelar.getChainInfo();

  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: axelarChainsMap[destinationEVMChain].axelarId,
    destination_address: destinationAddress,
    payload,
    type,
  };

  memo.fee = {
    amount: String(gasAmount.value),
    recipient: gmpAddresses.AXELAR_GAS,
  };

  const localAccount = keeper.getLCA();
  const natAmount = values(gasAmount)[0];
  const denom = await chainHubTools.getDenom(natAmount.brand);
  assert(denom, 'denom must be defined');
  const denomAmount = {
    denom,
    value: natAmount.value,
  };

  try {
    // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
    await zoeTools.localTransfer(seat, localAccount, gasAmount);

    await localAccount.transfer(
      {
        value: gmpAddresses.AXELAR_GMP,
        encoding: 'bech32',
        chainId,
      },
      denomAmount,
      { memo: JSON.stringify(memo, bigintReplacer) },
    );
  } catch (err) {
    // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
    await ctx.zoeTools.withdrawToSeat(localAccount, seat, gasAmount);
    throw new Error(`sendGmp failed: ${err}`);
  }
};

const supplyToAave = async (
  orch: Orchestrator,
  seat: ZCFSeat,
  ctx: PortfolioInstanceContext,
  gmpArgs: GmpArgsTransferAmount,
  keeper: GuestInterface<PortfolioKit>['keeper'],
) => {
  const { destinationEVMChain, transferAmount, gasAmount } = gmpArgs;
  const { contractAddresses } = ctx;

  const remoteEVMAddress = await keeper.getGMPAddress();

  await sendGmp(
    orch,
    seat,
    ctx,
    harden({
      destinationAddress: contractAddresses.factory,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      gasAmount,
      contractInvocationData: [
        {
          functionSignature: 'approve(address,uint256)',
          args: [contractAddresses.aavePool, transferAmount],
          target: contractAddresses.usdc,
        },
        {
          functionSignature: 'supply(address,uint256,address,uint16)',
          args: [contractAddresses.usdc, transferAmount, remoteEVMAddress, 0],
          target: contractAddresses.aavePool,
        },
      ],
    }),
    keeper,
  );
};

const withdrawFromAave = async (
  orch: Orchestrator,
  seat: ZCFSeat,
  ctx: PortfolioInstanceContext,
  gmpArgs: GmpArgsWithdrawAmount,
  keeper: GuestInterface<PortfolioKit>['keeper'],
) => {
  const { destinationEVMChain, withdrawAmount, gasAmount } = gmpArgs;
  const { contractAddresses } = ctx;

  const remoteEVMAddress = await keeper.getGMPAddress();

  await sendGmp(
    orch,
    seat,
    ctx,
    harden({
      destinationAddress: contractAddresses.factory,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      gasAmount,
      contractInvocationData: [
        {
          functionSignature: 'withdraw(address,uint256,address)',
          args: [contractAddresses.usdc, withdrawAmount, remoteEVMAddress],
          target: contractAddresses.aavePool,
        },
      ],
    }),
    keeper,
  );
};

const supplyToCompound = async (
  orch: Orchestrator,
  seat: ZCFSeat,
  ctx: PortfolioInstanceContext,
  gmpArgs: GmpArgsTransferAmount,
  keeper: GuestInterface<PortfolioKit>['keeper'],
) => {
  const { destinationEVMChain, transferAmount, gasAmount } = gmpArgs;
  const { contractAddresses } = ctx;

  const remoteEVMAddress = await keeper.getGMPAddress();
  assert(remoteEVMAddress, 'remoteEVMAddress must be defined');

  await sendGmp(
    orch,
    seat,
    ctx,
    harden({
      destinationAddress: contractAddresses.factory,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      gasAmount,
      contractInvocationData: [
        {
          functionSignature: 'approve(address,uint256)',
          args: [contractAddresses.compound, transferAmount],
          target: contractAddresses.usdc,
        },
        {
          functionSignature: 'supply(address,uint256)',
          args: [contractAddresses.usdc, transferAmount],
          target: contractAddresses.compound,
        },
      ],
    }),
    keeper,
  );
};

const withdrawFromCompound = async (
  orch: Orchestrator,
  seat: ZCFSeat,
  ctx: PortfolioInstanceContext,
  gmpArgs: GmpArgsWithdrawAmount,
  keeper: GuestInterface<PortfolioKit>['keeper'],
) => {
  const { destinationEVMChain, withdrawAmount, gasAmount } = gmpArgs;
  const { contractAddresses } = ctx;

  const remoteEVMAddress = await keeper.getGMPAddress();
  assert(remoteEVMAddress, 'remoteEVMAddress must be defined');

  await sendGmp(
    orch,
    seat,
    ctx,
    harden({
      destinationAddress: contractAddresses.factory,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      gasAmount,
      contractInvocationData: [
        {
          functionSignature: 'withdraw(address,uint256)',
          args: [contractAddresses.usdc, withdrawAmount],
          target: contractAddresses.compound,
        },
      ],
    }),
    keeper,
  );
};

export const rebalance = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['rebalance'],
  keeper: GuestInterface<PortfolioKit>['keeper'],
) => {
  const { destinationEVMChain } = offerArgs;
  const addToUSDNPosition = async (amount: Amount<'nat'>) => {
    const ica = keeper.getUSDNICA();
    const there = ica.getAddress();

    const localAcct = keeper.getLCA();
    const amounts = harden({ USDN: amount });
    trace('localTransfer', amount, 'to local', localAcct.getAddress().value);
    // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
    await ctx.zoeTools.localTransfer(seat, localAcct, amounts);
    try {
      trace('IBC transfer', amount, 'to', there, `${ica}`);
      await localAcct.transfer(there, amount);
      try {
        // NOTE: proposalShape guarantees that amount.brand is USDC
        const { msgSwap, msgLock } = makeSwapLockMessages(there, amount.value);

        trace('executing', [msgSwap, msgLock]);
        const result = await ica.executeEncodedTx([
          Any.toJSON(MsgSwap.toProtoMsg(msgSwap)),
          Any.toJSON(MsgLock.toProtoMsg(msgLock)),
        ]);
        trace('TODO: decode Swap, Lock result; detect errors', result);
      } catch (err) {
        console.error('⚠️ recover to local account.', amounts);
        await ica.transfer(localAcct.getAddress(), amount);
        // TODO: and what if this transfer fails?
        throw err;
      }
    } catch (err) {
      console.error('⚠️ recover to seat.', err);
      // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
      await ctx.zoeTools.withdrawToSeat(localAcct, seat, amounts);
      // TODO: and what if the withdrawToSeat fails?
      throw err;
    }
  };

  const proposal = seat.getProposal() as ProposalType['rebalance'];
  trace(
    'rebalance proposal',
    (proposal as any).give,
    (proposal as any).want,
    offerArgs,
  );

  if (!('give' in proposal)) {
    trace('TODO: withdraw');
    return;
  }

  const { give } = proposal;
  if (give.USDN) {
    await addToUSDNPosition(give.USDN);
  }
  if (give.Gmp && give.Aave) {
    trace('getGMPAddress()...');
    const evmAddr = await keeper.getGMPAddress();
    trace('evmAddr vow resolved', evmAddr);

    await sendTokensViaCCTP(
      orch,
      seat,
      ctx,
      {
        destinationEVMChain,
        amount: give.Aave,
      },
      keeper,
    );

    trace('TODO: Wait for 20 seconds before deploying funds to Aave');
    assert(
      destinationEVMChain,
      'destinationEVMChain is required to open a remote EVM account',
    );
    await supplyToAave(
      orch,
      seat,
      ctx,
      {
        destinationEVMChain: offerArgs.destinationEVMChain,
        transferAmount: give.Aave.value,
        gasAmount: harden({ Gmp: give.Gmp }),
      },
      keeper,
    );
  }
};

/**
 * Offer handler to make a portfolio and, optionally, open yield positions.
 *
 * ASSUME seat's proposal is guarded as per {@link makeProposalShapes}
 *
 * @returns {*} following continuing invitation pattern, with a topic
 * for each position opened, with the address in storagePath.
 */
export const openPortfolio = (async (
  orch: Orchestrator,
  ctx: PortfolioBootstrapContext,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['openPortfolio'], // TODO: USDN/USDC ratio
) => {
  await null; // see https://github.com/Agoric/agoric-sdk/wiki/No-Nested-Await
  try {
    const {
      makePortfolioKit,
      zoeTools,
      axelarChainsMap,
      chainHubTools,
      contractAddresses,
      inertSubscriber,
    } = ctx;
    const { destinationEVMChain } = offerArgs;
    const agoric = await orch.getChain('agoric');
    const { chainId } = await agoric.getChainInfo();
    const localAccount: LocalAccount = await agoric.makeAccount();
    const localAccountId: AccountId = `cosmos:${chainId}:${localAccount.getAddress().value}`;

    const nobleChain = await orch.getChain('noble');
    // Always make a Noble ICA, since we need it for CCTP
    const nobleAccount = await nobleChain.makeAccount();
    const nobleAddr = nobleAccount.getAddress();

    // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
    const kit = makePortfolioKit(nobleAccount, localAccount);
    kit.keeper.initAave(axelarChainsMap[destinationEVMChain].caip);
    kit.keeper.initCompound(axelarChainsMap[destinationEVMChain].caip);
    const reg = await localAccount.monitorTransfers(kit.tap);
    trace('Monitoring transfers for', localAccountId);
    // TODO: save reg somewhere???

    const storagePath = coerceAccountId(nobleAddr);
    const nobleTopic: GuestInterface<ResolvedPublicTopic<unknown>> = {
      description: 'USDN ICA',
      subscriber: inertSubscriber,
      storagePath,
    };

    const topics: GuestInterface<ResolvedPublicTopic<never>>[] = [
      {
        description: 'LCA',
        storagePath: localAccountId,
        subscriber: inertSubscriber,
      },
      nobleTopic,
    ];

    const { give } = seat.getProposal() as ProposalType['openPortfolio'];
    const portfolioCtx = {
      axelarChainsMap,
      chainHubTools,
      contractAddresses,
      keeper: kit.keeper,
      zoeTools,
      inertSubscriber,
    };

    // Only initialize EVM account if there are EVM protocol positions
    // TODO: Add a conditional for Compound
    if (give.Account) {
      try {
        const topic = await initRemoteEVMAccount(
          orch,
          seat,
          { ...portfolioCtx },
          {
            destinationEVMChain,
            gasAmount: harden({ Account: give.Account }),
          },
          kit.keeper,
        );
        topics.push(topic);
      } catch (err) {
        console.error('⚠️ initRemoteEVMAccount failed for Aave', err);
        seat.fail(err);
      }
    }

    if (!seat.hasExited()) {
      try {
        await rebalance(orch, portfolioCtx, seat, offerArgs, kit.keeper);
      } catch (err) {
        console.error('⚠️ rebalance failed', err);
        seat.fail(err);
      }
    }

    if (!seat.hasExited()) seat.exit();
    return harden({
      invitationMakers: kit.invitationMakers,
      publicTopics: topics,
    });
    /* c8 ignore start */
  } catch (err) {
    // XXX async flow DX: stack traces don't cross vow boundaries?
    console.error('🚨 openPortfolio flow failed', err);
    throw err;
  }
  /* c8 ignore end */
}) satisfies OrchestrationFlow;
harden(openPortfolio);
