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
import { makeTracer, mustMatch, NonNullish } from '@agoric/internal';
<<<<<<< HEAD
import { assert, Fail, makeError } from '@endo/errors';
=======
import { assert } from '@endo/errors';
>>>>>>> 2af2462149 (chore: create axelarChainsMap and updates types)
import type {
  CaipChainId,
  CosmosChainAddress,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
  AccountId,
  Denom,
} from '@agoric/orchestration';
import {
  AxelarGMPMessageType,
  type AxelarGmpOutgoingMemo,
  type SupportedEVMChains,
} from '@agoric/orchestration/src/axelar-types.js';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { PortfolioKit } from './portfolio.exo.ts';
import {
<<<<<<< HEAD
  buildGMPPayload,
  gmpAddresses,
} from '@agoric/orchestration/src/utils/gmp.js';
import {
  GMPArgsShape,
  type EVMContractAddresses,
  type GMPArgs,
  type LocalAccount,
  type OfferArgsFor,
  type ProposalType,
} from './type-guards.ts';
import { PositionChain, YieldProtocol } from './constants.js';
import type { CopyRecord } from '@endo/pass-style';
=======
  makeOfferArgsShapes,
  type AxelarChainsMap,
  type OfferArgsShapes,
  type ProposalShapes,
} from './type-guards.ts';
import { YieldProtocol } from './constants.js';
>>>>>>> 2af2462149 (chore: create axelarChainsMap and updates types)
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

type PortfolioContext = {
  zoeTools: GuestInterface<ZoeTools>;
  chainHubTools: {
    getDenom: (brand: Brand) => Denom | undefined;
  };
  makePortfolioKit: (
    localAccount: LocalAccount,
  ) => GuestInterface<PortfolioKit>;
  contract: EVMContractAddresses;
  inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
};

const initNobleAccount = async (
  orch: Orchestrator,
  kit: GuestInterface<PortfolioKit>,
  subscriber,
) => {
  const nobleChain = await orch.getChain('noble');
  const myNobleAccout = await nobleChain.makeAccount();
  const nobleAddr = myNobleAccout.getAddress();
  kit.keeper.initUSDN(myNobleAccout);

  const storagePath = coerceAccountId(nobleAddr);
  const topic: GuestInterface<ResolvedPublicTopic<unknown>> = {
    description: 'USDN ICA',
    subscriber,
    storagePath,
  };
  return topic;
};

const initRemoteEVMAccount = async (
  orch: Orchestrator,
  keeper: GuestInterface<PortfolioKit['keeper']>,
  seat: ZCFSeat,
  evmChain: SupportedEVMChains,
  ctx: PortfolioContext,
  protocol: YieldProtocol,
  localAccount: LocalAccount,
) => {
  const axelar = await orch.getChain('axelar');
  const { chainId, stakingTokens } = await axelar.getChainInfo();
  assert.equal(stakingTokens.length, 1, 'axelar has 1 staking token');

  const caipChainId: CaipChainId = PositionChain[evmChain];
  switch (protocol) {
    case 'Aave':
      keeper.initAave(caipChainId);
      break;
    case 'Compound':
      keeper.initCompound();
      break;
    default:
      assert.fail(protocol);
  }

  const { give } = seat.getProposal();

  await ctx.zoeTools.localTransfer(seat, localAccount, { GMPFee: give.GMPFee });
  try {
    const memo: AxelarGmpOutgoingMemo = {
      destination_chain: evmChain,
      destination_address: ctx.contract.factory,
      payload: [],
      type: AxelarGMPMessageType.ContractCall,
      fee: {
        amount: '1', // TODO: Get fee amount from api
        recipient: gmpAddresses.AXELAR_GAS,
      },
    };

    trace('Calling factory contract via Axelar', memo);
    const { AXELAR_GMP } = gmpAddresses;
    await localAccount.transfer(
      { value: AXELAR_GMP, encoding: 'bech32', chainId },
      give.GMPFee,
      { memo: JSON.stringify(memo) },
    );

    const getAddr = {
      Aave: () => keeper.getAaveAddress(),
      Compound: () => keeper.getCompoundAddress(),
    }[protocol];
    if (!getAddr) throw makeError(protocol);
    const addr = await getAddr();
    const accountId: AccountId = `${caipChainId}:${addr}`;

    const topic: GuestInterface<ResolvedPublicTopic<unknown>> = {
      description: `${protocol} EVM Addr`,
      subscriber: ctx.inertSubscriber,
      storagePath: accountId,
    };
    return topic;
  } catch (err) {
    console.error('⚠️ EVM account creation failed', err);
    await ctx.zoeTools.withdrawToSeat(localAccount, seat, give);
    assert.fail(`EVM account creation failed ${err}`);
  }
};

const sendTokensViaCCTP = async (
  orch: Orchestrator,
  ctx: Pick<PortfolioContext, 'zoeTools' | 'chainHubTools'>,
  keeper: GuestInterface<PortfolioKit>['keeper'],
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['openPortfolio'],
  destAddr: `0x${string}`,
  amount: Amount<'nat'>,
) => {
  const denom = ctx.chainHubTools.getDenom(amount.brand);
  assert(denom, `need denom for ${amount.brand} in chainHub`);

  const nobleAccount = keeper.getUSDNICA();

  const localAccount = keeper.getLCA();

  const amounts = harden({ Aave: amount });
  await ctx.zoeTools.localTransfer(seat, localAccount, amounts);

  try {
    trace('IBC transfer to Noble for CCTP');
    await localAccount.transfer(nobleAccount.getAddress(), amount);

    const denomAmount = {
      denom,
      value: amount.value,
    };

    const caipChainId: CaipChainId = PositionChain[offerArgs.evmChain];
    const destinationAddress: AccountId = `${caipChainId}:${destAddr}`;
    await nobleAccount.depositForBurn(destinationAddress, denomAmount);
  } catch (err) {
    await ctx.zoeTools.withdrawToSeat(localAccount, seat, amounts);
    const errorMsg = '⚠️ Noble transfer failed:';
    console.error(errorMsg, err);
    throw new Error(`${errorMsg} ${err}`);
  }
};

const makeAxelarMemo = (offerArgs: GMPArgs) => {
  const { destinationAddress, type, destinationEVMChain } = offerArgs;

  trace(`targets: [${destinationAddress}]`);

  const memo0 = {
    type,
    destination_chain: destinationEVMChain,
    destination_address: destinationAddress,
  };

  if (type === 3) {
    return harden({ ...memo0, payload: null });
  }

  const { gasAmount, contractInvocationData } = offerArgs;
  trace(
    `contractInvocationData: ${JSON.stringify(contractInvocationData, bigintReplacer)}`,
  );
  const payload = buildGMPPayload(contractInvocationData);
  const memo: AxelarGmpOutgoingMemo = {
    ...memo0,
    fee: {
      amount: String(gasAmount),
      recipient: gmpAddresses.AXELAR_GAS,
    },
    payload,
  };
  return harden(memo);
};

const bigintReplacer = (_, v) => (typeof v === 'bigint' ? `${v}` : v);

const makeTransferArgs = (
  amt: Amount<'nat'>,
  offerArgs: GMPArgs,
): Parameters<OrchestrationAccount<any>['transfer']> => {
  trace('Offer Args:', JSON.stringify(offerArgs, bigintReplacer));
  mustMatch(offerArgs, GMPArgsShape);
  const memo = makeAxelarMemo(offerArgs);

  // TODO: get the right denom for gas
  const denom = 'BLD';

  trace('amt and brand', amt.brand);

  // TODO: Maintain state for Axlear Chain ID
  // const axelar = await orch.getChain('axelar');
  const chainId = 'axelar';

  trace(`Initiating IBC Transfer...`);
  trace(`DENOM of token:${denom}`);

  return [
    { value: gmpAddresses.AXELAR_GMP, encoding: 'bech32', chainId },
    { denom, value: amt.value },
    { memo: JSON.stringify(memo) },
  ];
};

const sendGmp = async (
  seat: ZCFSeat,
  localAccount: LocalAccount,
  offerArgs: GMPArgs,
) => {
  // TODO: pass (stateless) give rather than (stateful) seat
  const { give } = seat.getProposal();

  const [[_kw, amt]] = Object.entries(give);
  // TODO: move >0 constraint to proposalShape
  amt.value > 0n || Fail`IBC transfer amount must be greater than zero`;
  trace('_kw, amt', _kw, amt);

  trace('Offer Args:', JSON.stringify(offerArgs, bigintReplacer));
  // mustMatch(offerArgs, GMPArgsShape);
  const args = makeTransferArgs(amt, offerArgs);

  trace(`Initiating IBC Transfer...`);

  await localAccount.transfer(...args); // TODO: move to flow or do host code with vows

  seat.exit();
  return 'sendGmp successful';
};

// TODO: get these from terms
const AAVE_POOL_ADDRESS = '0xccEa5C65f6d4F465B71501418b88FBe4e7071283';
const USDC_TOKEN_ADDRESS = '0xCaC7Ffa82c0f43EBB0FC11FCd32123EcA46626cf'; // not circle USDC

/*
TODO
      holder: {
        async withdrawFromAave(
          seat: ZCFSeat,
          evmChain: SupportedEVMChains,
          AMOUNT_TO_WITHDRAW: bigint,
        ) {
          throw Error('TODO: refactor');
          // TODO: dont hardcode positionID
          const positionId = 2;
          await this.facets.keeper.sendGmp(seat, {
            destinationAddress: gmpAddresses.AXELAR_GMP,
            type: AxelarGMPMessageType.ContractCall,
            destinationEVMChain: evmChain,
            gasAmount: 500000, // TODO: get from axelar API or some better way
            contractInvocationData: [
              {
                functionSignature: 'withdraw(address,uint256,address)',
                args: [
                  USDC_TOKEN_ADDRESS,
                  AMOUNT_TO_WITHDRAW,
                  this.facets.keeper.getRemoteAccountAddress(positionId),
                ],
                target: AAVE_POOL_ADDRESS,
              },
            ],
          });
        },
        supplyToAave(evmChain: SupportedEVMChains, AMOUNT_TO_TRANSFER: bigint) {
          throw Error('TODO: refactor');
          const invitation = async seat => {
            await this.facets.holder.supplyToAave(
              seat,
              evmChain,
              AMOUNT_TO_TRANSFER,
            );
          };
          return zcf.makeInvitation(invitation, 'evmTransaction');
        },
      },
*/

const supplyToAave = async (
  seat: ZCFSeat,
  evmChain: SupportedEVMChains,
  txfrAmt: Amount<'nat'>,
  localAccount: LocalAccount,
  remoteAddress: `0x${string}`,
) => {
  // XXX assume txfrAmount.brand is USDC
  await sendGmp(
    seat,
    localAccount,
    harden({
      destinationAddress: gmpAddresses.AXELAR_GMP,
      destinationEVMChain: evmChain,
      type: AxelarGMPMessageType.ContractCall,
      gasAmount: 500000, // TODO: get from axelar API or some better way
      contractInvocationData: [
        {
          functionSignature: 'approve(address,uint256)',
          args: [AAVE_POOL_ADDRESS, txfrAmt.value],
          target: USDC_TOKEN_ADDRESS,
        },
        {
          functionSignature: 'supply(address,uint256,address,uint16)',
          args: [USDC_TOKEN_ADDRESS, txfrAmt.value, remoteAddress, 0],
          target: AAVE_POOL_ADDRESS,
        },
      ],
    }),
  );
};

export const rebalance = async (
  orch: Orchestrator,
  ctx: Pick<PortfolioContext, 'zoeTools' | 'chainHubTools'>,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['rebalance'],
  keeper: GuestInterface<PortfolioKit>['keeper'],
) => {
  const addToUSDNPosition = async (amount: Amount<'nat'>) => {
    const ica = keeper.getUSDNICA();
    const there = ica.getAddress();

    const localAcct = keeper.getLCA();
    const amounts = harden({ USDN: amount });
    trace('localTransfer', amount, 'to local', localAcct.getAddress().value);
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
  if ('GMPFee' in give && give.Aave) {
    trace('getAaveAddress()...');
    const evmAddr = await keeper.getAaveAddress();
    trace('evmAddr vow resolved', evmAddr);

    await sendTokensViaCCTP(
      orch,
      ctx,
      keeper,
      seat,
      offerArgs,
      evmAddr,
      give.Aave,
    );
    trace('TODO: Wait for 20 seconds before deploying funds to Aave');
    assert(
      offerArgs.evmChain,
      'evmChain is required to open a remote EVM account',
    );
    const lca = keeper.getLCA();
    await supplyToAave(seat, offerArgs.evmChain, give.Aave, lca, evmAddr);
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
<<<<<<< HEAD
  ctx: PortfolioContext,
=======
  ctx: {
    zoeTools: GuestInterface<ZoeTools>;
    makePortfolioKit: () => PortfolioKit;
    contractAddresses: {
      aavePool: `0x${string}`;
      compound: `0x${string}`;
      factory: `0x${string}`;
      usdc: `0x${string}`;
    };
    axelarChainsMap: AxelarChainsMap;
    inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  },
>>>>>>> 2af2462149 (chore: create axelarChainsMap and updates types)
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['openPortfolio'], // TODO: USDN/USDC ratio
) => {
  mustMatch(offerArgs, makeOfferArgsShapes());
  await null; // see https://github.com/Agoric/agoric-sdk/wiki/No-Nested-Await
  try {
<<<<<<< HEAD
    const { makePortfolioKit } = ctx;
    const agoric = await orch.getChain('agoric');
    const { chainId } = await agoric.getChainInfo();
    const localAccount: LocalAccount = await agoric.makeAccount();
    const localAccountId: AccountId = `cosmos:${chainId}:${localAccount.getAddress().value}`;
    const kit = makePortfolioKit(localAccount);
    const reg = await localAccount.monitorTransfers(kit.tap);
    trace('Monitoring transfers for', localAccountId);
    // TODO: save reg somewhere???

    // Always make a Noble ICA, since we need it for CCTP
    const nobleTopic = await initNobleAccount(orch, kit, ctx.inertSubscriber);

    const topics: GuestInterface<ResolvedPublicTopic<never>>[] = [
      {
        description: 'LCA',
        storagePath: localAccountId,
=======
    const { makePortfolioKit, contractAddresses, axelarChainsMap } = ctx;
    const kit = makePortfolioKit();

    const initRemoteEVMAccount = async (protocol: YieldProtocol) => {
      const { evmChain, axelarGasFee } = offerArgs;
      assert(evmChain, 'evmChain is required to open a remote EVM account');

      const [agoric, axelar] = await Promise.all([
        orch.getChain('agoric'),
        orch.getChain('axelar'),
      ]);

      const { chainId, stakingTokens } = await axelar.getChainInfo();
      assert.equal(stakingTokens.length, 1, 'axelar has 1 staking token');

      const localAccount = await localP;
      const positionId = kit.keeper.add(
        protocol,
        axelarChainsMap[evmChain].caip,
        localAccount,
      );

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
          destination_address: contractAddresses.factory,
          payload: [],
          type: AxelarGMPMessageType.ContractCall,
          fee: {
            amount: String(axelarGasFee), // TODO: split the gas between makeAccount and GMP calls
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

        const caipChainId = axelarChainsMap[offerArgs.evmChain].caip;
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
>>>>>>> 2af2462149 (chore: create axelarChainsMap and updates types)
        subscriber: ctx.inertSubscriber,
      },
      nobleTopic,
    ];

    const { give } = seat.getProposal() as ProposalType['openPortfolio'];

    // Only initialize EVM account if there are EVM protocol positions
    // TODO: Add a conditional for Compound
    if ('GMPFee' in give && give.Aave) {
      const { evmChain } = offerArgs;
      assert(evmChain, 'evmChain required to open Aave position');
      evmChain in PositionChain || Fail`bad evmChain ${evmChain}`;
      try {
<<<<<<< HEAD
<<<<<<< HEAD
        const topic = await initRemoteEVMAccount(
          orch,
          kit.keeper,
          seat,
          evmChain,
          ctx,
          'Aave',
          localAccount,
=======
        const positionId = await initRemoteEVMAccount(YieldProtocol.Aave);
        trace(
          'TODO: use makePromiseKit to delay resolving initRemoteEVMAccount until the account is ready',
        );
        await sendTokensViaCCTP(positionId, give.Aave);
        trace('TODO: Wait for 20 seconds before deploying funds to Aave');
        const { evmChain, axelarGasFee } = offerArgs;
=======
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

    if (give.Aave || give.Compound) {
      await initRemoteEVMAccount();
      await kit.holder.wait(180n); // TODO: replace with promiseKit
      trace(
        'TODO: use makePromiseKit to delay resolving initRemoteEVMAccount until the account is ready',
      );
    }

    if (give.Aave) {
      try {
        const { evmChain, axelarGasFee } = offerArgs;
        await sendTokensViaCCTP(give.Aave);
        await kit.holder.wait(20n);
>>>>>>> d7daaa4b04 (chore: use timeService to add wait() in flows)
        await kit.holder.supplyToAave(
          seat,
          contractAddresses.aavePool,
          contractAddresses.usdc,
          evmChain,
          give.Aave.value,
          axelarGasFee,
>>>>>>> 2af2462149 (chore: create axelarChainsMap and updates types)
        );
<<<<<<< HEAD
        topics.push(topic);
=======
        // TODO: wait for the response in receiveUpCall and then add position using the keeper?
        kit.keeper.addAavePosition(axelarChainsMap[evmChain].caip);
>>>>>>> d7daaa4b04 (chore: use timeService to add wait() in flows)
      } catch (err) {
        console.error('⚠️ initRemoteEVMAccount failed for Aave', err);
        seat.fail(err);
      }
    }

    if (!seat.hasExited()) {
      try {
<<<<<<< HEAD
        await rebalance(orch, ctx, seat, offerArgs, kit.keeper);
=======
        const { evmChain, axelarGasFee } = offerArgs;
        await sendTokensViaCCTP(give.Compound);
        await kit.holder.wait(20n);
        // TODO: add Compound specific methods in the holder facet
        await kit.holder.supplyToAave(
          seat,
          contractAddresses.aavePool,
          contractAddresses.usdc,
          evmChain,
          give.Compound.value,
          axelarGasFee,
        );
        kit.keeper.addAavePosition(axelarChainsMap[evmChain].caip);
>>>>>>> d7daaa4b04 (chore: use timeService to add wait() in flows)
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
