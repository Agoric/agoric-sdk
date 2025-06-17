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
import { makeTracer, NonNullish } from '@agoric/internal';
import type {
  CaipChainId,
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
import { assert } from '@endo/errors';
import { PositionChain, YieldProtocol } from './constants.js';
import type { PortfolioKit } from './portfolio.exo.ts';
import type {
  EVMContractAddresses,
  EVMOfferArgs,
  ProposalShapes,
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

const denomForBrand = async (orch, brand) => {
  const agoric = await orch.getChain('agoric');
  const assets = await agoric.getVBankAssetInfo();
  const { denom } = NonNullish(
    assets.find(a => a.brand === brand),
    `${brand} not registered in ChainHub`,
  );
  return denom;
};

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
    zoeTools: GuestInterface<ZoeTools>;
    makePortfolioKit: () => PortfolioKit;
    contract: EVMContractAddresses;
    inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  },
  seat: ZCFSeat,
  offerArgs: EVMOfferArgs, // TODO: USDN/USDC ratio
  // passed as a promise to alleviate contract start-up sync constraints
  localP: Promise<OrchestrationAccount<{ chainId: 'agoric-any' }>>,
) => {
  await null; // see https://github.com/Agoric/agoric-sdk/wiki/No-Nested-Await
  try {
    const { makePortfolioKit, contract } = ctx;
    const kit = makePortfolioKit();

    const initRemoteEVMAccount = async (protocol: YieldProtocol) => {
      const { evmChain } = offerArgs;
      assert(evmChain, 'evmChain is required to open a remote EVM account');

      const [agoric, axelar] = await Promise.all([
        orch.getChain('agoric'),
        orch.getChain('axelar'),
      ]);

      const { chainId, stakingTokens } = await axelar.getChainInfo();
      assert.equal(stakingTokens.length, 1, 'axelar has 1 staking token');

      const localAccount = await localP;
      const caipChainId = PositionChain[offerArgs.evmChain];
      const positionId = kit.keeper.add(protocol, caipChainId, localAccount);

      try {
        // @ts-expect-error
        await localAccount.monitorTransfers(kit.tap);
        trace('Monitoring transfers setup successfully');

        const { give } = seat.getProposal();
        const [[_kw, amt]] = Object.entries(give);

        const assets = await agoric.getVBankAssetInfo();
        const { denom } =
          assets.find(a => a.brand === amt.brand) ||
          (() => {
            throw new Error(`${amt.brand} not registered in vbank`);
          })();

        await ctx.zoeTools.localTransfer(seat, localAccount, give);

        const memo: AxelarGmpOutgoingMemo = {
          destination_chain: evmChain,
          destination_address: contract.factory,
          payload: [],
          type: AxelarGMPMessageType.ContractCall,
          fee: {
            amount: '1', // TODO: Get fee amount from api
            recipient: gmpAddresses.AXELAR_GAS,
          },
        };

        trace('Initiating IBC transfer');
        await localAccount.transfer(
          {
            value: gmpAddresses.AXELAR_GMP,
            encoding: 'bech32',
            chainId,
          },
          {
            denom,
            value: amt.value,
          },
          { memo: JSON.stringify(memo) },
        );

        return positionId;
      } catch (err) {
        await ctx.zoeTools.withdrawToSeat(localAccount, seat, give);
        const errorMsg = `EVM account creation failed ${err}`;
        throw new Error(errorMsg);
      }
    };

    const sendTokensViaCCTP = async (
      positionId: number,
      amount: Amount<'nat'>,
    ) => {
      const nobleChain = await orch.getChain('noble');
      const nobleAccount = await nobleChain.makeAccount();

      const localAccount = await makeLocalAccount(orch, ctx);

      const amounts = harden({ USDC: amount });
      await ctx.zoeTools.localTransfer(seat, localAccount, amounts);

      try {
        trace('IBC transfer to Noble for CCTP');
        await localAccount.transfer(nobleAccount.getAddress(), amount);

        const denom = await denomForBrand(orch, amount.brand);
        const denomAmount = {
          denom,
          value: amount.value,
        };

        const remoteAccountAddress =
          kit.keeper.getRemoteAccountAddress(positionId);
        assert(
          remoteAccountAddress,
          'Remote account address not found for position',
        );

        const caipChainId = PositionChain[offerArgs.evmChain];
        const destinationAddress = `${caipChainId}:${remoteAccountAddress}`;
        await nobleAccount.depositForBurn(
          destinationAddress as `${string}:${string}:${string}`,
          denomAmount,
        );
      } catch (err) {
        await ctx.zoeTools.withdrawToSeat(localAccount, seat, amounts);
        const errorMsg = `'Noble transfer failed: ${err}`;
        throw new Error(errorMsg);
      }
    };

    const initNobleAccount = async () => {
      const nobleChain = await orch.getChain('noble');
      const myNobleAccout = await nobleChain.makeAccount();
      const nobleAddr = myNobleAccout.getAddress();
      const { chainId } = await nobleChain.getChainInfo();
      const positionId = kit.keeper.add(
        'USDN',
        `cosmos:${chainId}` as CaipChainId,
        myNobleAccout,
      );

      const storagePath = coerceAccountId(nobleAddr);
      const topic: GuestInterface<ResolvedPublicTopic<unknown>> = {
        description: 'USDN ICA',
        subscriber: ctx.inertSubscriber,
        storagePath,
      };
      return { topic, positionId };
    };

    const openUSDNPosition = async (
      amount: Amount<'nat'>,
      positionId: number,
    ) => {
      const acct = kit.keeper.getAccount(
        positionId,
        'USDN',
      ) as OrchestrationAccount<{
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

    const { give } = seat.getProposal() as ProposalShapes['openPortfolio'];
    const topics: GuestInterface<ResolvedPublicTopic<never>>[] = [];
    if (give.USDN) {
      const { topic, positionId } = await initNobleAccount();
      topics.push(topic);
      try {
        await openUSDNPosition(give.USDN, positionId);
      } catch (err) {
        seat.fail(err);
        return harden({
          invitationMakers: kit.invitationMakers,
          publicTopics: topics,
        });
      }
    }

    // Only initialize EVM account if there are EVM protocol positions
    // TODO: Add a conditional for Compound
    if (give.Aave) {
      try {
        const positionId = await initRemoteEVMAccount(YieldProtocol.Aave);
        trace(
          'TODO: use makePromiseKit to delay resolving initRemoteEVMAccount until the account is ready',
        );
        await sendTokensViaCCTP(positionId, give.Aave);
        trace('TODO: Wait for 20 seconds before deploying funds to Aave');
        assert(
          offerArgs.evmChain,
          'evmChain is required to open a remote EVM account',
        );
        await kit.holder.supplyToAave(
          seat,
          offerArgs.evmChain,
          give.Aave.value,
        );
      } catch (err) {
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
