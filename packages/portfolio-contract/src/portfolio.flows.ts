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
import { makeTracer } from '@agoric/internal';
import {
  type CosmosChainAddress,
  type OrchestrationAccount,
  type OrchestrationFlow,
  type Orchestrator,
} from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import {
  AxelarGMPMessageType,
  type AxelarGmpOutgoingMemo,
  type ContractCall,
  type SupportedDestinationChains,
} from '@agoric/orchestration/src/axelar-types.js';
import { gmpAddresses } from '@agoric/orchestration/src/utils/gmp.js';
import { Fail } from '@endo/errors';
import type { PortfolioKit } from './portfolio.exo.ts';
import type { ProposalShapes } from './type-guards.ts';
import type { YieldProtocol } from './constants.js';
// TODO: import { VaultType } from '@agoric/cosmic-proto/dist/codegen/noble/dollar/vaults/v1/vaults';

const trace = makeTracer('PortF');

/**
 * Creates Aave supply contract call
 * @param {string} aavePoolAddress - The Aave pool contract address
 * @param {string} asset - The asset address to supply
 * @param {string} amount - The amount to supply
 * @param {string} onBehalfOf - The address to supply on behalf of
 * @returns {ContractCall} The contract call object
 */
const makeAaveSupplyCall = (
  aavePoolAddress: string,
  asset: string,
  amount: string,
  onBehalfOf: string,
): ContractCall => ({
  target: aavePoolAddress as `0x${string}`,
  functionSignature: 'supply(address,uint256,address,uint16)',
  args: [asset, amount, onBehalfOf, 0],
});

/**
 * Creates Aave borrow contract call
 * @param {string} aavePoolAddress - The Aave pool contract address
 * @param {string} asset - The asset address to borrow
 * @param {string} amount - The amount to borrow
 * @param {string} onBehalfOf - The address to borrow on behalf of
 * @returns {ContractCall} The contract call object
 */
const makeAaveBorrowCall = (
  aavePoolAddress: string,
  asset: string,
  amount: string,
  onBehalfOf: string,
): ContractCall => ({
  target: aavePoolAddress as `0x${string}`,
  functionSignature: 'borrow(address,uint256,uint256,uint16,address)',
  args: [asset, amount, 2, 0, onBehalfOf],
});

/**
 * Creates Compound supply contract call
 * @param {string} compoundAddress - The Compound contract address
 * @param {string} amount - The amount to supply
 * @returns {ContractCall} The contract call object
 */
const makeCompoundSupplyCall = (
  compoundAddress: string,
  amount: string,
): ContractCall => ({
  target: compoundAddress as `0x${string}`,
  functionSignature: 'supply(uint256)',
  args: [amount],
});

/**
 * Creates Compound borrow contract call
 * @param {string} compoundAddress - The Compound contract address
 * @param {string} amount - The amount to borrow
 * @returns {ContractCall} The contract call object
 */
const makeCompoundBorrowCall = (
  compoundAddress: string,
  amount: string,
): ContractCall => ({
  target: compoundAddress as `0x${string}`,
  functionSignature: 'borrow(uint256)',
  args: [amount],
});

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
    zoeTools: GuestInterface<ZoeTools>;
    makePortfolioKit: () => PortfolioKit;
    contractAddresses: {
      aavePoolAddress: string;
      compoundAddress: string;
      factoryAddress: string;
    };
    inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  },
  seat: ZCFSeat,
  offerArgs: {
    evmChain?: SupportedDestinationChains;
    yieldProtocol: YieldProtocol;
  }, // TODO: USDN/USDC ratio
  // passed as a promise to alleviate contract start-up sync constraints
  localP: Promise<OrchestrationAccount<{ chainId: 'agoric-any' }>>,
) => {
  await null; // see https://github.com/Agoric/agoric-sdk/wiki/No-Nested-Await
  try {
    const { makePortfolioKit, contractAddresses } = ctx;
    const kit = makePortfolioKit();

    const initRemoteEVMAccount = async () => {
      const { evmChain } = offerArgs;
      assert(evmChain, 'evmChain is required to open a remote EVM account');

      const [agoric, axelar] = await Promise.all([
        orch.getChain('agoric'),
        orch.getChain('axelar'),
      ]);

      const { chainId, stakingTokens } = await axelar.getChainInfo();
      const remoteDenom = stakingTokens[0].denom;
      remoteDenom || Fail`${chainId} does not have stakingTokens in config`;

      const localAccount = await agoric.makeAccount();
      const localChainAddress = localAccount.getAddress();
      trace('Local Chain Address:', localChainAddress);

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
          destination_address: contractAddresses.factoryAddress,
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

        seat.exit();
      } catch (err) {
        await ctx.zoeTools.withdrawToSeat(localAccount, seat, give);
        const errorMsg = `EVM account creation failed ${err}`;
        seat.exit(errorMsg);
        throw new Error(errorMsg);
      }
    };

    const initNobleAccount = async () => {
      const nobleChain = await orch.getChain('noble');
      const myNobleAccout = await nobleChain.makeAccount();
      const nobleAddr = myNobleAccout.getAddress();
      kit.keeper.init('USDN', myNobleAccout);

      const storagePath = coerceAccountId(nobleAddr);
      const topic: GuestInterface<ResolvedPublicTopic<unknown>> = {
        description: 'USDN ICA',
        subscriber: ctx.inertSubscriber,
        storagePath,
      };
      return topic;
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

    const { give } = seat.getProposal() as ProposalShapes['openPortfolio'];
    const topics: GuestInterface<ResolvedPublicTopic<never>>[] = [];
    if (give.USDN) {
      const topic = await initNobleAccount();
      topics.push(topic);
      try {
        await openUSDNPosition(give.USDN);
      } catch (err) {
        seat.fail(err);
      }
    } else {
      try {
        await initRemoteEVMAccount();
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
