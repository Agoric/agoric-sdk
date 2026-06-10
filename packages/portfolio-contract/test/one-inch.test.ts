import test from 'ava';
import { encodeFunctionData } from 'viem';
import type { SwapDesc } from '@agoric/portfolio-api';
import {
  getOneInchSwapArgs,
  oneInchRouterABI,
} from '../src/interfaces/one-inch.ts';

const TOKEN_IN = '0x0000000000000000000000000000000000000abc' as const;
const USDC = '0xCaC7Ffa82c0f43EBB0FC11FCd32123EcA46626cf' as const;
const RECEIVER = '0x1111111111111111111111111111111111111111' as const;
const EXECUTOR = '0x2222222222222222222222222222222222222222' as const;
const SRC_RECEIVER = '0x3333333333333333333333333333333333333333' as const;

const AMOUNT_IN = 5_000_000n;
const MIN_RETURN = 4_900_000n;

const swap: SwapDesc = {
  provider: '1inch',
  tokenIn: TOKEN_IN,
  amountIn: AMOUNT_IN,
  flags: 0n,
  executor: EXECUTOR,
  srcReceiver: SRC_RECEIVER,
  data: '0xdeadbeef',
};

const controlled = {
  usdc: USDC,
  receiver: RECEIVER,
  minReturnAmount: MIN_RETURN,
} as const;

test('args encode to a swap() call targeting the V6 selector', t => {
  const data = encodeFunctionData({
    abi: oneInchRouterABI,
    functionName: 'swap',
    args: getOneInchSwapArgs(swap, controlled),
  });
  // V6 swap(address,(...),bytes) selector
  t.is(data.slice(0, 10), '0x07ed2379');
});

test('fills the contract-controlled fund-safety fields', t => {
  const [executor, desc, innerData] = getOneInchSwapArgs(swap, controlled);
  t.is(executor, EXECUTOR);
  t.is(innerData, swap.data);
  t.deepEqual(desc, {
    srcToken: TOKEN_IN,
    dstToken: USDC,
    srcReceiver: SRC_RECEIVER,
    dstReceiver: RECEIVER,
    amount: AMOUNT_IN,
    minReturnAmount: MIN_RETURN,
    flags: 0n,
  });
});

test('the planner cannot redirect dstToken or dstReceiver', t => {
  // Even though SwapDesc carries no dstToken/dstReceiver, the built args
  // always pin them to the contract-controlled values.
  const [, desc] = getOneInchSwapArgs(swap, controlled);
  t.is(desc.dstToken, USDC);
  t.is(desc.dstReceiver, RECEIVER);
});
