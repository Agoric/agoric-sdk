import test from 'ava';

import type { Brand, DisplayInfo, Issuer } from '@agoric/ertp';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import { Far } from '@endo/pass-style';
import type { FlowStatus } from '@agoric/portfolio-api';
import { planNeeded, pickBalance } from '../src/engine.ts';

const mockDepositAsset = (name: string, assetKind: 'nat') => {
  // avoid VatData
  const brand = Far(`${name} brand`) as Brand<'nat'>;
  const issuer = Far(`${name} issuer`) as Issuer<'nat'>;
  const displayInfo: DisplayInfo = harden({ assetKind, decimalPlaces: 6 });
  const denom = 'ibc/123';
  const depositAsset: AssetInfo = harden({
    brand,
    denom,
    issuer,
    displayInfo,
    issuerName: name,
    proposedName: name,
  });
  return depositAsset;
};

test('ignore additional balances', t => {
  const usdc = mockDepositAsset('USDC', 'nat');
  const { denom, brand } = usdc;

  const balances = [
    { amount: '50', denom },
    { amount: '123', denom: 'ubld' },
  ];

  const actual = pickBalance(balances, usdc);
  t.deepEqual(actual, { brand, value: 50n });
});

// Mock marshaller for testing
const mockMarshaller = (flowStatus?: FlowStatus) => ({
  fromCapData: (capData: any) => flowStatus,
  toCapData: (data: any) => ({ body: JSON.stringify(data), slots: [] }),
});

// Mock vstorage for testing
const mockVstorage = (flowStatus?: FlowStatus, shouldThrow = false) => ({
  readStorageMeta: async (path: string, opts: any) => {
    if (shouldThrow) {
      throw new Error('Failed to read vstorage');
    }
    const streamCell = {
      blockHeight: '100',
      values: [JSON.stringify({ body: JSON.stringify(flowStatus), slots: [] })],
    };
    return {
      blockHeight: 100n,
      result: { value: JSON.stringify(streamCell) },
    };
  },
});

test('planNeeded returns true when flow has no vstorage data', async t => {
  const portfolioKey = 'portfolio1';
  const flowKey = 'flow1';
  const flowKeys = new Set<string>(); // Empty set - no vstorage data
  const vstorage = mockVstorage() as any;
  const portfoliosPathPrefix = 'published.ymax0.portfolios';
  const marshaller = mockMarshaller() as any;
  const readOpts = { minBlockHeight: 100n, retries: 4 };

  const result = await planNeeded(
    portfolioKey,
    flowKey,
    flowKeys,
    vstorage,
    portfoliosPathPrefix,
    marshaller,
    readOpts,
  );

  t.true(result, 'Should need a plan when flow has no vstorage data');
});

test('planNeeded returns true when flow has status: init', async t => {
  const portfolioKey = 'portfolio1';
  const flowKey = 'flow1';
  const flowKeys = new Set(['flow1']); // Flow has vstorage data
  const flowStatus: FlowStatus = { state: 'init' };
  const vstorage = mockVstorage(flowStatus) as any;
  const portfoliosPathPrefix = 'published.ymax0.portfolios';
  const marshaller = mockMarshaller(flowStatus) as any;
  const readOpts = { minBlockHeight: 100n, retries: 4 };

  const result = await planNeeded(
    portfolioKey,
    flowKey,
    flowKeys,
    vstorage,
    portfoliosPathPrefix,
    marshaller,
    readOpts,
  );

  t.true(result, 'Should need a plan when flow has status: init');
});

test('planNeeded returns false when flow has status: run', async t => {
  const portfolioKey = 'portfolio1';
  const flowKey = 'flow1';
  const flowKeys = new Set(['flow1']); // Flow has vstorage data
  const flowStatus: FlowStatus = { state: 'run', step: 1, how: 'testing' };
  const vstorage = mockVstorage(flowStatus) as any;
  const portfoliosPathPrefix = 'published.ymax0.portfolios';
  const marshaller = mockMarshaller(flowStatus) as any;
  const readOpts = { minBlockHeight: 100n, retries: 4 };

  const result = await planNeeded(
    portfolioKey,
    flowKey,
    flowKeys,
    vstorage,
    portfoliosPathPrefix,
    marshaller,
    readOpts,
  );

  t.false(result, 'Should not need a plan when flow has status: run');
});

test('planNeeded returns false when flow has status: done', async t => {
  const portfolioKey = 'portfolio1';
  const flowKey = 'flow1';
  const flowKeys = new Set(['flow1']); // Flow has vstorage data
  const flowStatus: FlowStatus = { state: 'done' };
  const vstorage = mockVstorage(flowStatus) as any;
  const portfoliosPathPrefix = 'published.ymax0.portfolios';
  const marshaller = mockMarshaller(flowStatus) as any;
  const readOpts = { minBlockHeight: 100n, retries: 4 };

  const result = await planNeeded(
    portfolioKey,
    flowKey,
    flowKeys,
    vstorage,
    portfoliosPathPrefix,
    marshaller,
    readOpts,
  );

  t.false(result, 'Should not need a plan when flow has status: done');
});

test('planNeeded returns false when flow has status: fail', async t => {
  const portfolioKey = 'portfolio1';
  const flowKey = 'flow1';
  const flowKeys = new Set(['flow1']); // Flow has vstorage data
  const flowStatus: FlowStatus = {
    state: 'fail',
    step: 1,
    how: 'testing',
    error: 'test error',
  };
  const vstorage = mockVstorage(flowStatus) as any;
  const portfoliosPathPrefix = 'published.ymax0.portfolios';
  const marshaller = mockMarshaller(flowStatus) as any;
  const readOpts = { minBlockHeight: 100n, retries: 4 };

  const result = await planNeeded(
    portfolioKey,
    flowKey,
    flowKeys,
    vstorage,
    portfoliosPathPrefix,
    marshaller,
    readOpts,
  );

  t.false(result, 'Should not need a plan when flow has status: fail');
});

test('planNeeded returns false when flow status cannot be read', async t => {
  const portfolioKey = 'portfolio1';
  const flowKey = 'flow1';
  const flowKeys = new Set(['flow1']); // Flow has vstorage data
  const vstorage = mockVstorage(undefined, true) as any; // Will throw error
  const portfoliosPathPrefix = 'published.ymax0.portfolios';
  const marshaller = mockMarshaller() as any;
  const readOpts = { minBlockHeight: 100n, retries: 4 };

  const result = await planNeeded(
    portfolioKey,
    flowKey,
    flowKeys,
    vstorage,
    portfoliosPathPrefix,
    marshaller,
    readOpts,
  );

  t.false(result, 'Should not need a plan when flow status cannot be read (conservative approach)');
});

