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
  denomHash,
  type ChainHub,
  type CosmosChainAddress,
  type OrchestrationAccount,
  type OrchestrationFlow,
  type Orchestrator,
} from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { PortfolioKit } from './portfolio.exo.ts';
import type { ProposalShapes } from './type-guards.ts';
import type {
  ContractCall,
  SupportedDestinationChains,
} from '@agoric/orchestration/src/axelar-types.js';
import type { MakeEvmAccountKit } from '@agoric/orchestration/src/examples/axelar-gmp-account-kit.js';
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

/**
 * Creates and monitors an EVM account for portfolio operations
 * Similar to createAndMonitorLCA in axelar-gmp.flows.js
 */
export const createRemoteEvmAccount = (async (
  orch: Orchestrator,
  ctx: {
    makeEvmAccountKit: MakeEvmAccountKit;
    chainHub: GuestInterface<ChainHub>;
    zoeTools: GuestInterface<ZoeTools>;
    contractAddresses: {
      aavePoolAddress: string;
      compoundAddress: string;
      factoryAddress: string;
    };
    inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  },
  seat: ZCFSeat,
  offerArgs: {
    evmChain: SupportedDestinationChains;
  },
) => {
  await null;

  try {
    const { chainHub, makeEvmAccountKit } = ctx;
    const { evmChain } = offerArgs;

    const [agoric, axelar] = await Promise.all([
      orch.getChain('agoric'),
      orch.getChain('axelar'),
    ]);

    const { chainId: axelarChainId, stakingTokens } =
      await axelar.getChainInfo();
    const remoteDenom = stakingTokens[0].denom;
    remoteDenom ||
      assert.fail(`${axelarChainId} does not have stakingTokens in config`);

    const localAccount = await agoric.makeAccount();
    const localChainAddress = localAccount.getAddress();
    trace('Local Chain Address:', localChainAddress);

    const agoricChainId = (await agoric.getChainInfo()).chainId;
    const { transferChannel } = await chainHub.getConnectionInfo(
      agoricChainId,
      axelarChainId,
    );
    assert(
      transferChannel.counterPartyChannelId,
      'unable to find sourceChannel',
    );

    const localDenom = `ibc/${denomHash({
      denom: remoteDenom,
      channelId: transferChannel.channelId,
    })}`;

    const assets = await agoric.getVBankAssetInfo();
    const info = await axelar.getChainInfo();
    const evmAccountKit = makeEvmAccountKit({
      localAccount,
      localChainAddress,
      sourceChannel: transferChannel.counterPartyChannelId,
      remoteDenom,
      localDenom,
      assets,
      remoteChainInfo: info,
    });

    await localAccount.monitorTransfers(evmAccountKit.tap);
    trace('Monitoring transfers setup successfully');

    const { give } = seat.getProposal();
    const [[_kw, amt]] = Object.entries(give);

    const { denom } =
      assets.find(a => a.brand === amt.brand) ||
      (() => {
        throw new Error(`${amt.brand} not registered in vbank`);
      })();

    await ctx.zoeTools.localTransfer(seat, localAccount, give);

    // Create EVM account by calling factory contract
    const memo = {
      destination_chain: evmChain,
      destination_address: ctx.contractAddresses.factoryAddress,
      payload: [], // Empty payload for account creation
      type: 1, // ContractCall
      fee: {
        amount: '1000000', // Gas fee
        recipient: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd', // AXELAR_GAS
      },
    };

    try {
      await localAccount.transfer(
        {
          value:
            'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5', // AXELAR_GMP
          encoding: 'bech32',
          chainId,
        },
        {
          denom,
          value: amt.value,
        },
        { memo: JSON.stringify(memo) },
      );
    } catch (e) {
      await ctx.zoeTools.withdrawToSeat(localAccount, seat, give);
      const errorMsg = `EVM account creation failed ${e}`;
      seat.exit(errorMsg);
      throw new Error(errorMsg);
    }

    seat.exit();
    return harden({
      invitationMakers: evmAccountKit.invitationMakers,
      holder: evmAccountKit.holder,
    });
  } catch (err) {
    console.error('🚨 createAndMonitorEvmAccount flow failed', err);
    throw err;
  }
}) satisfies OrchestrationFlow;
harden(createAndMonitorEvmAccount);

/**
 * Sends a GMP message for portfolio operations
 * Similar to sendGmp in axelar-gmp-account-kit.js
 */
export const portfolioSendGmp = async (
  orch: Orchestrator,
  ctx: {
    zoeTools: GuestInterface<ZoeTools>;
    contractAddresses: {
      aavePoolAddress: string;
      compoundAddress: string;
      factoryAddress: string;
    };
    inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  },
  seat: ZCFSeat,
  args: {
    destinationAddress: string;
    destinationEVMChain: SupportedDestinationChains;
    gasAmount: number;
    contractInvocationData: ContractCall[];
    type: 1 | 2;
  },
  localP: Promise<OrchestrationAccount<{ chainId: 'agoric-any' }>>,
) => {
  await null;

  try {
    const {
      destinationAddress,
      destinationEVMChain,
      gasAmount,
      contractInvocationData,
      type = 1, // Default to ContractCall
    } = offerArgs;

    trace('Portfolio sendGmp Args:', JSON.stringify(offerArgs));

    destinationAddress || assert.fail('Destination address must be defined');
    destinationEVMChain || assert.fail('Destination EVM chain must be defined');

    const isContractInvocation = [1, 2].includes(type);
    if (isContractInvocation) {
      gasAmount || assert.fail(`gasAmount must be defined for type ${type}`);
      contractInvocationData ||
        assert.fail('contractInvocationData is not defined');
      contractInvocationData.length !== 0 ||
        assert.fail('contractInvocationData array is empty');
    }

    const [agoric, axelar] = await Promise.all([
      orch.getChain('agoric'),
      orch.getChain('axelar'),
    ]);

    const localAccount = await localP;
    const { give } = seat.getProposal();
    const [[_kw, amt]] = Object.entries(give);

    amt.value > 0n ||
      assert.fail('IBC transfer amount must be greater than zero');

    const assets = await agoric.getVBankAssetInfo();
    const { denom } =
      assets.find(a => a.brand === amt.brand) ||
      (() => {
        throw new Error(`${amt.brand} not registered in vbank`);
      })();

    const axelarChainInfo = await axelar.getChainInfo();

    const payload = contractInvocationData.map(call => ({
      target: call.target,
      data: call.functionSignature,
    }));

    const memo = {
      destination_chain: destinationEVMChain,
      destination_address: destinationAddress,
      payload,
      type,
    };

    if (type === 1 || type === 2) {
      memo.fee = {
        amount: String(gasAmount),
        recipient: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd', // AXELAR_GAS
      };
    }

    await ctx.zoeTools.localTransfer(seat, localAccount, give);

    await localAccount.transfer(
      {
        value:
          'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5', // AXELAR_GMP
        encoding: 'bech32',
        chainId: axelarChainInfo.chainId,
      },
      {
        denom,
        value: amt.value,
      },
      { memo: JSON.stringify(memo) },
    );

    seat.exit();
    return 'portfolioSendGmp successful';
  } catch (err) {
    console.error('🚨 portfolioSendGmp flow failed', err);
    seat.fail(err);
    throw err;
  }
};
harden(portfolioSendGmp);

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
    makeEvmAccountKit?: MakeEvmAccountKit;
    contractAddresses: {
      aavePoolAddress: string;
      compoundAddress: string;
      factoryAddress: string;
    };
    inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  },
  seat: ZCFSeat,
  _offerArgs: unknown, // TODO: USDN/USDC ratio
  // passed as a promise to alleviate contract start-up sync constraints
  localP: Promise<OrchestrationAccount<{ chainId: 'agoric-any' }>>,
) => {
  await null; // see https://github.com/Agoric/agoric-sdk/wiki/No-Nested-Await
  try {
    const kit = ctx.makePortfolioKit();

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
      const acct = kit.keeper.getAccount('USDN');
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
