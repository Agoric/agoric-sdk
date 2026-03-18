/**
 * @file Flow tests for the user-fees withdraw prototype.
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { documentStorageSchema } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import { PermitWitnessTransferFromFunctionABIType } from '@agoric/orchestration/src/utils/permit2/signatureTransferHelpers.js';
import { hexToBytes } from '@noble/hashes/utils';
import { decodeAbiParameters, decodeFunctionData } from 'viem';
import { walletMulticallABI } from '../src/interfaces/orch-factory.ts';
import { predictWalletAddress } from '../src/utils/evm-orch-factory.ts';
import { erc20ABI } from '../src/interfaces/erc20.ts';
import { type MovementDesc } from '../src/type-guards-steps.ts';
import { BLD, USDC, docOpts, mocks, silent } from './flow-test-kit.ts';
import { contractsMock } from './mocks.ts';
import { makeStorageTools } from './supports.ts';
import { provideCosmosAccount } from '../src/portfolio.flows.ts';
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

  const [permit2Call, usdcTransferCall] = callMessage.calls;
  return {
    id: callMessage.id,
    permit2: decodeFunctionData({
      abi: [PermitWitnessTransferFromFunctionABIType],
      data: permit2Call.data,
    }),
    transfer: decodeFunctionData({
      abi: erc20ABI,
      data: usdcTransferCall.data,
    }),
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

test('withdraw with Ethereum step sends fee to fee collector', async t => {
  const trader = {
    sourceAccountId:
      'eip155:1:0x1234567890AbcdEF1234567890aBcdef12345678' as const,
    withdraw: {
      chainId: 1n,
      amount: AmountMath.make(USDC, 2_000_000n),
      token: contractsMock.Ethereum.usdc,
    },
  };
  const traderAddress = parseAccountId(trader.sourceAccountId)
    .accountAddress as `0x${string}`;

  // docs-design/user-fees.md: observed on 2026-03-09 for
  // sourceChain=agoric, destinationChain=Ethereum, gasLimit=279473
  const axelarQuotes = { uusdc: 370_132n, ubld: 91_246_921n };
  const paddedQuotes = {
    uusdc: withPad(axelarQuotes.uusdc),
    ubld: withPad(axelarQuotes.ubld),
  };

  const { orch, ctx, offer, storage, txResolver, cosmosId } = mocks({}, {});
  const { log } = offer;
  const { getPortfolioStatus, getFlowHistory } = makeStorageTools(storage);

  const traderP = (async () => {
    const kit = await ctx.makePortfolioKit({
      sourceAccountId: trader.sourceAccountId,
    });
    await provideCosmosAccount(orch, 'agoric', kit, silent);

    const { value: owner } = kit.reader.getLocalAccount().getAddress();
    const atEthereum = getRemoteAddress('Ethereum', owner, ctx.walletBytecode);

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
      spender: atEthereum,
      permit2Payload: {
        owner: traderAddress,
        permit: {
          permitted: { token, amount: paddedQuotes.uusdc },
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
      plannerFacet: Awaited<ReturnType<typeof ctx.makePortfolioKit>>['planner'];
      portfolioId: number;
    }>,
  ) => {
    const { flowNum, portfolioId, plannerFacet } = await traderStartedP;
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const detail = flowsRunning[`flow${flowNum}`];
    if (detail.type !== 'withdraw')
      throw t.fail(`expected withdraw, got ${detail.type}`);
    t.is(detail.toChain, 'Ethereum');
    t.deepEqual(detail.amount, trader.withdraw.amount);
    t.deepEqual(detail.fee, AmountMath.make(USDC, paddedQuotes.uusdc));

    const steps: MovementDesc[] = [
      {
        src: '@Ethereum',
        dest: '-Ethereum',
        amount: detail.amount,
        fee: AmountMath.make(BLD, paddedQuotes.ubld),
      },
    ];
    plannerFacet.resolveFlowPlan(flowNum, steps);
    await txResolver.drainPending();
  };

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

  const decodedCalls = decodeWalletMulticall(rawMemo as string);

  t.like(decodedCalls.permit2, {
    functionName: 'permitWitnessTransferFrom',
  });
  t.like(decodedCalls.permit2.args[1], {
    to: contractsMock.Ethereum.feeCollector,
    requestedAmount: paddedQuotes.uusdc,
  });
  t.is(decodedCalls.permit2.args[2], traderAddress);

  t.like(decodedCalls.transfer, {
    functionName: 'transfer',
  });
  t.deepEqual(decodedCalls.transfer.args, [
    traderAddress,
    trader.withdraw.amount.value,
  ]);

  const failCall = log.find((entry: any) => entry._method === 'fail');
  t.falsy(failCall, 'seat should not fail');

  const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
  t.deepEqual(flowsRunning, {}, 'flow should be cleaned up after completion');
  const flowHistory = await getFlowHistory(portfolioId, flowNum);
  t.is(flowHistory.at(-1)?.state, 'done');

  t.snapshot(log, 'call log');
  t.snapshot(decodedCalls, 'decoded wallet multicall');
  await documentStorageSchema(t, storage, docOpts);
});
