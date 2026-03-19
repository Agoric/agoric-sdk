/**
 * @file Flow tests for the user-fees withdraw prototype.
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { documentStorageSchema } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import { PermitWitnessTransferFromFunctionABIType } from '@agoric/orchestration/src/utils/permit2/signatureTransferHelpers.js';
import type { FundsFlowPlan } from '@agoric/portfolio-api';
import { hexToBytes } from '@noble/hashes/utils';
import { decodeAbiParameters, decodeFunctionData } from 'viem';
import { walletMulticallABI } from '../src/interfaces/orch-factory.ts';
import { predictWalletAddress } from '../src/utils/evm-orch-factory.ts';
import { erc20ABI } from '../src/interfaces/erc20.ts';
import { type MovementDesc } from '../src/type-guards-steps.ts';
import {
  BLD,
  USDC,
  docOpts,
  mocks,
  silent,
} from './flow-test-kit.ts';
import { contractsMock } from './mocks.ts';
import { makeStorageTools } from './supports.ts';
import {
  getChargingChain,
  getChargeStepIndexes,
  provideCosmosAccount,
} from '../src/portfolio.flows.ts';
import type { Bech32Address } from '@agoric/orchestration';
import type { AxelarChain } from '@agoric/portfolio-api';

const decodeWalletMulticall = (memo: string) => {
  const parsedMemo = JSON.parse(memo);
  const payload =
    `0x${Buffer.from(parsedMemo.payload, 'base64').toString('hex')}` as `0x${string}`;
  const [callMessage] = decodeAbiParameters(
    walletMulticallABI[0].inputs,
    payload,
  );

  return {
    id: callMessage.id,
    calls: callMessage.calls,
  };
};

const withPad = (quote: bigint) => (quote * 12n + 9n) / 10n;

const getRemoteAddress = (
  chain: AxelarChain,
  owner: Bech32Address,
  bytecode: `0x${string}`,
) =>
  predictWalletAddress({
    owner,
    factoryAddress: contractsMock[chain].factory,
    gatewayAddress: contractsMock[chain].gateway,
    gasServiceAddress: contractsMock[chain].gasService,
    walletBytecode: hexToBytes(bytecode.replace(/^0x/, '')),
  });

const axelarQuotes = {
  // docs-design/user-fees.md: observed on 2026-03-09 for
  // sourceChain=agoric, destinationChain=Ethereum, gasLimit=279473
  uusdc: 370_132n,
  ubld: 91_246_921n,
};
const paddedQuotes = {
  uusdc: withPad(axelarQuotes.uusdc),
  ubld: withPad(axelarQuotes.ubld),
};
const sum = (values: bigint[]) =>
  values.reduce((total, value) => total + value, 0n);

type WithdrawScenario = {
  trader: {
    sourceAccountId: `eip155:${number}:${`0x${string}`}`;
    remoteChain: AxelarChain;
    authorizedUserFee?: bigint;
    withdraw: {
      chainId: bigint;
      amount: ReturnType<typeof AmountMath.make>;
      token: `0x${string}`;
    };
  };
  plan: (amount: ReturnType<typeof AmountMath.make>) => MovementDesc[];
  expected: {
    permit2: false | { feeCollector: `0x${string}`; requestedAmount: bigint };
  };
};

const runWithdrawScenario = test.macro({
  exec: async (t, scenario: WithdrawScenario) => {
    const { trader } = scenario;
    const authorizedUserFee = trader.authorizedUserFee ?? paddedQuotes.uusdc;
    const traderAddress = parseAccountId(trader.sourceAccountId)
      .accountAddress as `0x${string}`;

    const { orch, ctx, offer, storage, txResolver, cosmosId } = mocks({}, {});
    const { log } = offer;
    const { getPortfolioStatus, getFlowHistory } = makeStorageTools(storage);

    const traderP = (async () => {
      const kit = await ctx.makePortfolioKit({
        sourceAccountId: trader.sourceAccountId,
      });
      await provideCosmosAccount(orch, 'agoric', kit, silent);

      const { value: owner } = kit.reader.getLocalAccount().getAddress();
      const spender = getRemoteAddress(
        trader.remoteChain,
        owner,
        ctx.walletBytecode,
      );

      const [payloadMisc, permitMisc] = [
        {
          witnessTypeString: 'WithdrawWitness',
          witness:
            '0x0000000000000000000000000000000000000000000000000000000000000000',
          signature: '0x1234',
        },
        { nonce: 7115368379195441n, deadline: 1357923600n },
      ] as const;

      const { token, chainId, amount } = trader.withdraw;
      const flowKey = kit.evmHandler.withdraw({
        withdrawDetails: { token, amount: amount.value },
        domain: { chainId },
        spender,
        permit2Payload: {
          owner: traderAddress,
          permit: {
            permitted: { token, amount: authorizedUserFee },
            ...permitMisc,
          },
          ...payloadMisc,
        },
      });
      const flowNum = Number(flowKey.replace('flow', ''));

      return {
        flowNum,
        plannerFacet: kit.planner,
        portfolioId: kit.reader.getPortfolioId(),
      };
    })();

    const plannerRun = async (
      traderStartedP: Promise<{
        flowNum: number;
        plannerFacet: Awaited<
          ReturnType<typeof ctx.makePortfolioKit>
        >['planner'];
        portfolioId: number;
      }>,
    ) => {
      const { flowNum, portfolioId, plannerFacet } = await traderStartedP;
      const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
      const detail = flowsRunning[`flow${flowNum}`];
      if (detail.type !== 'withdraw')
        throw t.fail(`expected withdraw, got ${detail.type}`);
      t.is(detail.toChain, trader.remoteChain);
      t.deepEqual(detail.amount, trader.withdraw.amount);
      t.deepEqual(detail.fee, AmountMath.make(USDC, authorizedUserFee));

      const steps = scenario.plan(detail.amount);
      plannerFacet.resolveFlowPlan(flowNum, steps);
      await txResolver.drainPending();
    };

    const runScenario = async () => {
      const [{ flowNum, portfolioId }] = await Promise.all([
        traderP,
        plannerRun(traderP),
      ]);
      await eventLoopIteration();

      const axelarId = await cosmosId('axelar');
      const axelarTransfer = log.findLast(
        (entry: any) =>
          entry._method === 'transfer' && entry.address?.chainId === axelarId,
      );
      t.truthy(axelarTransfer, 'GMP transfer should be made for withdrawToEVM');

      const rawMemo = axelarTransfer?.opts?.memo;
      t.truthy(rawMemo, 'GMP transfer should include a wallet payload memo');

      const decoded = decodeWalletMulticall(rawMemo as string);
      const decodedCalls = decoded.calls.map((call, index) =>
        decodeFunctionData({
          abi:
            index === 0 && scenario.expected.permit2
              ? [PermitWitnessTransferFromFunctionABIType]
              : erc20ABI,
          data: call.data,
        }),
      );

      if (scenario.expected.permit2) {
        t.is(decodedCalls.length, 2);
        t.like(decodedCalls[0], {
          functionName: 'permitWitnessTransferFrom',
        });
        t.like((decodedCalls[0] as any).args[1], {
          to: scenario.expected.permit2.feeCollector,
          requestedAmount: scenario.expected.permit2.requestedAmount,
        });
        t.is((decodedCalls[0] as any).args[2], traderAddress);
        t.like(decodedCalls[1], {
          functionName: 'transfer',
        });
        t.deepEqual((decodedCalls[1] as any).args, [
          traderAddress,
          trader.withdraw.amount.value,
        ]);
      } else {
        t.is(decodedCalls.length, 1);
        t.like(decodedCalls[0], {
          functionName: 'transfer',
        });
        t.deepEqual((decodedCalls[0] as any).args, [
          traderAddress,
          trader.withdraw.amount.value,
        ]);
      }

      const failCall = log.find((entry: any) => entry._method === 'fail');
      t.falsy(failCall, 'seat should not fail');

      const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
      t.deepEqual(flowsRunning, {}, 'flow should be cleaned up after completion');
      const flowHistory = await getFlowHistory(portfolioId, flowNum);
      t.is(flowHistory.at(-1)?.state, 'done');

      t.snapshot(log, 'call log');
      t.snapshot(decodedCalls, 'decoded wallet multicall');
      await documentStorageSchema(t, storage, docOpts);
    };

    await runScenario();
  },
  title: (_providedTitle = '', _scenario: WithdrawScenario) => _providedTitle,
});

test(
  'withdraw with Ethereum step sends fee to fee collector',
  runWithdrawScenario,
  {
    trader: {
      sourceAccountId:
        'eip155:1:0x1234567890AbcdEF1234567890aBcdef12345678' as const,
      remoteChain: 'Ethereum',
      withdraw: {
        chainId: 1n,
        amount: AmountMath.make(USDC, 2_000_000n),
        token: contractsMock.Ethereum.usdc,
      },
    },
    plan: amount => [
      {
        src: '@Ethereum',
        dest: '-Ethereum',
        amount,
        fee: AmountMath.make(BLD, paddedQuotes.ubld),
        userFee: AmountMath.make(USDC, paddedQuotes.uusdc),
      },
    ],
    expected: {
      permit2: {
        feeCollector: contractsMock.Ethereum.feeCollector,
        requestedAmount: paddedQuotes.uusdc,
      },
    },
  } satisfies WithdrawScenario,
);

test(
  'withdraw without Ethereum charge step does not send fee to fee collector',
  runWithdrawScenario,
  {
    trader: {
      sourceAccountId:
        'eip155:42161:0x1234567890AbcdEF1234567890aBcdef12345678' as const,
      remoteChain: 'Arbitrum',
      withdraw: {
        chainId: 42161n,
        amount: AmountMath.make(USDC, 2_000_000n),
        token: contractsMock.Arbitrum.usdc,
      },
    },
    plan: amount => [
      {
        src: '@Arbitrum',
        dest: '-Arbitrum',
        amount,
        fee: AmountMath.make(BLD, 100n),
      },
    ],
    expected: {
      permit2: false,
    },
  } satisfies WithdrawScenario,
);

test.todo(
  'create-and-deposit on Ethereum L1 collects userFee(plan) to feeCollector',
);

test.todo('deposit-more on Ethereum L1 collects userFee(plan) to feeCollector');

test.todo(
  'rebalance with Ethereum-mainnet execution collects userFee(plan) to feeCollector',
);

test.todo(
  'userFee(plan) with >1 Ethereum-mainnet step handles partial execution failure when some chargeable steps succeed and some fail',
);

test.todo(
  'withdraw charges the sum of user fees across multiple executable Ethereum steps',
);

test('getChargeStepIndexes picks the first charge step for each chain', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const fee = AmountMath.make(BLD, 100n);
  const plan: MovementDesc[] = [
    {
      src: '@Base',
      dest: '@agoric',
      amount,
      fee,
    },
    {
      src: '@Ethereum',
      dest: 'Aave_Ethereum',
      amount,
      fee,
      userFee: amount,
    },
    {
      src: '@Ethereum',
      dest: 'Compound_Ethereum',
      amount,
      fee,
      userFee: amount,
    },
    {
      src: '@Base',
      dest: 'Aave_Base',
      amount,
      fee,
      userFee: amount,
    },
  ];
  t.deepEqual(getChargeStepIndexes(plan), {
    Ethereum: 1,
    Base: 3,
  });
});

test('getChargeStepIndexes ignores plan order metadata and uses the lowest index', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const fee = AmountMath.make(BLD, 100n);
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: '@Ethereum',
        dest: '@agoric',
        amount,
        fee,
        userFee: amount,
      },
      {
        src: '@agoric',
        dest: '@noble',
        amount,
      },
      {
        src: '@Ethereum',
        dest: 'Compound_Ethereum',
        amount,
        fee,
        userFee: amount,
      },
      {
        src: '@Base',
        dest: 'Compound_Base',
        amount,
        fee,
        userFee: amount,
      },
    ],
    order: [[1, [0]], [2, [1]], [3, []]],
  };
  t.deepEqual(getChargeStepIndexes(plan), {
    Ethereum: 0,
    Base: 3,
  });
});

test('getChargeStepIndexes picks the lowest index for a chain', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const fee = AmountMath.make(BLD, 100n);
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: '@Ethereum',
        dest: 'Aave_Ethereum',
        amount,
        fee,
        userFee: amount,
      },
      {
        src: '@Ethereum',
        dest: 'Compound_Ethereum',
        amount,
        fee,
        userFee: amount,
      },
    ],
    order: [],
  };
  t.deepEqual(getChargeStepIndexes(plan), {
    Ethereum: 0,
  });
});

test('getChargeStepIndexes omits chains with no charge step', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const fee = AmountMath.make(BLD, 100n);
  const plan: MovementDesc[] = [
    {
      src: '@Base',
      dest: 'Aave_Base',
      amount,
      fee,
      userFee: amount,
    },
  ];
  t.deepEqual(getChargeStepIndexes(plan), { Base: 0 });
});

test('getChargeStepIndexes throws on a chargeable step with no execution chain', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const fee = AmountMath.make(BLD, 100n);
  const plan: MovementDesc[] = [
    {
      src: '@noble',
      dest: '@Ethereum',
      amount,
      fee,
      userFee: amount,
    },
  ];

  t.throws(() => getChargeStepIndexes(plan), {
    message: /cannot determine execution chain/,
  });
});

test('getChargeStepIndexes keys protocol withdrawal steps by the pool chain', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const fee = AmountMath.make(BLD, 100n);
  const plan: MovementDesc[] = [
    {
      src: 'Aave_Ethereum',
      dest: '@agoric',
      amount,
      fee,
      userFee: amount,
    },
  ];

  t.deepEqual(getChargeStepIndexes(plan), { Ethereum: 0 });
});

test('getChargingChain rejects plans that charge on multiple chains', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const fee = AmountMath.make(BLD, 100n);
  const plan: MovementDesc[] = [
    {
      src: '@Base',
      dest: 'Aave_Base',
      amount,
      fee,
      userFee: amount,
    },
    {
      src: '@Ethereum',
      dest: '-Ethereum',
      amount,
      fee,
      userFee: amount,
    },
  ];

  t.throws(() => getChargingChain(plan), {
    message: /at most one EVM chain per plan/,
  });
});
