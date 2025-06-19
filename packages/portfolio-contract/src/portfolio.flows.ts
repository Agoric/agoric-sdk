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
  CaipChainId,
  ChainHub,
  CosmosChainAddress,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import {
  AxelarGMPMessageType,
  type AxelarGmpOutgoingMemo,
} from '@agoric/orchestration/src/axelar-types.js';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import { gmpAddresses } from '@agoric/orchestration/src/utils/gmp.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { PortfolioKit } from './portfolio.exo.ts';
import {
  EVMOfferArgsShape,
  type AxelarChainsMap,
  type EVMContractAddresses,
  type EVMOfferArgs,
  type ProposalShapes,
} from './type-guards.ts';
// TODO: import { VaultType } from '@agoric/cosmic-proto/dist/codegen/noble/dollar/vaults/v1/vaults';

const trace = makeTracer('PortF');

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
  ctx: {
    chainHub: GuestInterface<ChainHub>;
    zoeTools: GuestInterface<ZoeTools>;
    makePortfolioKit: () => PortfolioKit;
    axelarChainsMap: AxelarChainsMap;
    contractAddresses: EVMContractAddresses;
    inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  },
  seat: ZCFSeat,
  offerArgs: EVMOfferArgs, // TODO: USDN/USDC ratio
  // passed as a promise to alleviate contract start-up sync constraints
  localP: Promise<OrchestrationAccount<{ chainId: 'agoric-any' }>>,
) => {
  mustMatch(offerArgs, EVMOfferArgsShape);
  await null; // see https://github.com/Agoric/agoric-sdk/wiki/No-Nested-Await
  try {
    const { makePortfolioKit, contractAddresses, axelarChainsMap, chainHub } =
      ctx;
    const { give } = seat.getProposal() as ProposalShapes['openPortfolio'];
    const kit = makePortfolioKit();

    const initRemoteEVMAccount = async (amount: Amount<'nat'>) => {
      const { evmChain } = offerArgs;
      assert(evmChain, 'evmChain is required to open a remote EVM account');

      const axelar = await orch.getChain('axelar');
      const axelarInfo = await axelar.getChainInfo();
      kit.holder.setupAxelarChainInfo(axelarInfo);

      const { chainId, stakingTokens } = axelarInfo;
      assert.equal(stakingTokens.length, 1, 'axelar has 1 staking token');

      const localAcct = await localP;
      kit.holder.setupGmpLCA(localAcct);
      const amounts = harden({ Account: amount });
      trace('localTransfer', amount, 'to local', localAcct.getAddress().value);
      await ctx.zoeTools.localTransfer(seat, localAcct, amounts);

      try {
        // @ts-expect-error
        await localAcct.monitorTransfers(kit.tap);
        trace('Monitoring transfers setup successfully');

        const memo: AxelarGmpOutgoingMemo = {
          destination_chain: evmChain,
          destination_address: contractAddresses.factory,
          payload: [],
          type: AxelarGMPMessageType.ContractCall,
          fee: {
            amount: String(amount.value),
            recipient: gmpAddresses.AXELAR_GAS,
          },
        };

        const denom = await chainHub.getDenom(amount.brand);
        assert(denom, 'denom must be defined');
        const denomAmount = {
          denom,
          value: amount.value,
        };

        await localAcct.transfer(
          {
            value: gmpAddresses.AXELAR_GMP,
            encoding: 'bech32',
            chainId,
          },
          denomAmount,
          { memo: JSON.stringify(memo) },
        );
      } catch (err) {
        await ctx.zoeTools.withdrawToSeat(localAcct, seat, amounts);
        const errorMsg = `EVM account creation failed ${err}`;
        throw new Error(errorMsg);
      }
    };

    const sendTokensViaCCTP = async (amount: Amount<'nat'>) => {
      const nobleChain = await orch.getChain('noble');
      const nobleAccount = await nobleChain.makeAccount();

      const localAcct = await localP;
      const amounts = harden({ Aave: amount });
      trace('localTransfer', amount, 'to local', localAcct.getAddress().value);
      await ctx.zoeTools.localTransfer(seat, localAcct, amounts);

      try {
        await localAcct.transfer(nobleAccount.getAddress(), amount);

        const denom = await chainHub.getDenom(amount.brand);
        assert(denom, 'denom must be defined');
        const denomAmount = {
          denom,
          value: amount.value,
        };

        const remoteAccountAddress = kit.holder.getRemoteAccountAddress();
        assert(
          remoteAccountAddress,
          'Remote account address not found for position',
        );

        assert(offerArgs.evmChain, `evmChain must be defined`);
        const caipChainId = axelarChainsMap[offerArgs.evmChain].caip;
        const destinationAddress = `${caipChainId}:${remoteAccountAddress}`;
        trace(`destinationAddress: ${destinationAddress}`);
        await nobleAccount.depositForBurn(
          destinationAddress as `${string}:${string}:${string}`,
          denomAmount,
        );
      } catch (err) {
        await ctx.zoeTools.withdrawToSeat(localAcct, seat, amounts);
        const errorMsg = `'Noble transfer failed: ${err}`;
        throw new Error(errorMsg);
      }
    };

    const initNobleAccount = async () => {
      const nobleChain = await orch.getChain('noble');
      const myNobleAccout = await nobleChain.makeAccount();
      const nobleAddr = myNobleAccout.getAddress();
      const { chainId } = await nobleChain.getChainInfo();
      kit.keeper.addUSDNPosition(
        `cosmos:${chainId}` as CaipChainId,
        myNobleAccout,
      );

      const storagePath = coerceAccountId(nobleAddr);
      const topic: GuestInterface<ResolvedPublicTopic<unknown>> = {
        description: 'USDN ICA',
        subscriber: ctx.inertSubscriber,
        storagePath,
      };
      return { topic };
    };

    const openUSDNPosition = async (amount: Amount<'nat'>) => {
      const acct = kit.keeper.getAccount('USDN') as OrchestrationAccount<{
        chainId: 'noble-any';
      }>;
      const there = acct.getAddress();

      const localAcct = await localP;
      const amounts = harden({ USDN: amount });
      trace('localTransfer', amount, 'to local', localAcct.getAddress().value);
      await ctx.zoeTools.localTransfer(seat, localAcct, amounts);
      try {
        trace('IBC transfer', amount, 'to', there, `${acct}`);
        await localAcct.transfer(there, amount);
        try {
          // NOTE: proposalShape guarantees that amount.brand is USDC
          const { msgSwap, msgLock } = makeSwapLockMessages(
            there,
            amount.value,
          );

          trace('executing', [msgSwap, msgLock]);
          const result = await acct.executeEncodedTx([
            Any.toJSON(MsgSwap.toProtoMsg(msgSwap)),
            Any.toJSON(MsgLock.toProtoMsg(msgLock)),
          ]);
          trace('TODO: decode Swap, Lock result; detect errors', result);
        } catch (err) {
          console.error('⚠️ recover to local account.', amounts);
          await acct.transfer(localAcct.getAddress(), amount);
          // TODO: and what if this transfer fails?
          throw err;
        }
      } catch (err) {
        console.error('⚠️ recover to seat.', err);
        await ctx.zoeTools.withdrawToSeat(localAcct, seat, amounts);
        // TODO: and what if the withdrawToSeat fails?
        throw err;
      }
    };

    const topics: GuestInterface<ResolvedPublicTopic<never>>[] = [];
    if (give.USDN) {
      const { topic } = await initNobleAccount();
      topics.push(topic);
      try {
        await openUSDNPosition(give.USDN);
      } catch (err) {
        seat.fail(err);
        return harden({
          invitationMakers: kit.invitationMakers,
          publicTopics: topics,
        });
      }
    }

    if (give.Account) {
      await initRemoteEVMAccount(give.Account);
      await kit.holder.wait(180n); // TODO: replace with promiseKit
      trace(
        'TODO: use makePromiseKit to delay resolving initRemoteEVMAccount until the account is ready',
      );
    }

    if (give.Aave && give.Gmp) {
      trace('Opening Aave position: starting remote EVM account setup');
      const { evmChain } = offerArgs;
      assert(evmChain, 'evmChain must be defined');
      await sendTokensViaCCTP(give.Aave);
      await kit.holder.wait(20n);
      kit.keeper.addAavePosition(axelarChainsMap[evmChain].caip);
      await kit.holder.supplyToAave({
        seat,
        aavePoolAddress: contractAddresses.aavePool,
        usdcTokenAddress: contractAddresses.usdc,
        evmChain,
        amountToTransfer: give.Aave.value,
        amount: give.Gmp,
      });
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
