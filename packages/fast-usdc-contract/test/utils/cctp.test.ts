import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import type { EReturn } from '@endo/far';
import cctpChainInfo from '@agoric/orchestration/src/cctp-chain-info.js';
import type { AccountId } from '@agoric/orchestration';
import { commonSetup } from '../supports.js';
import { makeSupportsCctp } from '../../src/utils/cctp.ts';

type Common = EReturn<typeof commonSetup>;

const test = anyTest as TestFn<
  Common & { supportsCctp: ReturnType<typeof makeSupportsCctp> }
>;

test.beforeEach(async t => {
  const common = await commonSetup(t);
  const { chainHub } = common.facadeServices;

  for (const [name, info] of Object.entries(cctpChainInfo)) {
    chainHub.registerChain(name, {
      ...info,
      // @ts-expect-error `chainId` not in `BaseChainInfo` but required for `CosmosChainInfoShapeV1`
      chainId: `${info.namespace}:${info.reference}`,
    });
  }

  const supportsCctp = makeSupportsCctp(chainHub);
  t.context = { ...common, supportsCctp };
});

test('supports eip155 namespaces', t => {
  const { supportsCctp } = t.context;

  const testEthAccount: AccountId =
    'eip155:1:0x1234567890abcdef1234567890abcdef12345678';
  t.true(supportsCctp(testEthAccount));

  const testArbAccount: AccountId =
    'eip155:42161:0x1234567890abcdef1234567890abcdef12345678';
  t.true(supportsCctp(testArbAccount));
});

test('returns false for unknown namespace', t => {
  const { supportsCctp } = t.context;

  const testAccountId: AccountId = 'unknown:unknown:unknown';
  t.false(supportsCctp(testAccountId));
});

test('returns false for unknown reference', t => {
  const { supportsCctp } = t.context;

  const testAccountId: AccountId =
    'eip155:404:0x1234567890abcdef1234567890abcdef12345678';
  t.false(supportsCctp(testAccountId));
});

test('solana not supported', async t => {
  const { supportsCctp } = t.context;
  const { chainHub } = t.context.facadeServices;
  const { vowTools } = t.context.utils;

  t.is(
    (await vowTools.when(chainHub.getChainInfo('solana')))
      .cctpDestinationDomain,
    5,
    'solana cctpDestinationDomain is in ChainHub',
  );

  const testAccountId: AccountId = `solana:${cctpChainInfo.solana.reference}:Gf4DKri6Kw5fHL3VkrX12BaFLWCJXhKShP5epvQWJtpf`;
  t.false(supportsCctp(testAccountId));
});
