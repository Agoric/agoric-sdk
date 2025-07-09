// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { gmpAddresses } from '@agoric/orchestration/src/utils/gmp.js';
import { passStyleOf } from '@endo/far';
import {
  makeAxelarMemo,
  type GmpArgsContractCall,
} from '../src/pos-gmp.flows.ts';
import {
  setupTrader,
  simulateAckTransferToAxelar,
  simulateCCTPAck,
  simulateUpcallFromAxelar,
} from './contract-setup.ts';
import { localAccount0 } from './mocks.ts';

const { fromEntries, keys } = Object;

test('makeAxelarMemo constructs correct memo JSON', t => {
  const { brand } = makeIssuerKit('USDC');

  const type = 1; // contract call
  const destinationEVMChain = 'Avalanche';
  const destinationAddress = '0x58E0bd49520364A115CeE4B03DffC1C08A2D1D09';
  const keyword = 'Gas';
  const amounts = {
    Gas: {
      brand,
      value: 2000000n,
    },
  };

  const gmpArgs: GmpArgsContractCall = {
    type,
    contractInvocationData: [],
    destinationEVMChain,
    destinationAddress,
    keyword,
    amounts,
  };

  // From a valid transaction from AxelarScan: https://testnet.axelarscan.io/tx/CA5A2E8CA6770B0FBBC1789DE5FB14F5955BD62CD0C1F975C88DE3DA657025F2
  const expectedPayload = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ];

  const result = makeAxelarMemo('Avalanche', gmpArgs);
  const parsed = JSON.parse(result);

  t.deepEqual(parsed, {
    type,
    destination_chain: 'Avalanche',
    destination_address: destinationAddress,
    payload: expectedPayload,
    fee: {
      amount: String(amounts[keyword].value),
      recipient: gmpAddresses.AXELAR_GAS,
    },
  });
});

const range = (n: number) => [...Array(n).keys()];

const getPortfolioInfo = (key, storage) => {
  const info = storage.getDeserialized(key).at(-1);
  const { positionKeys, flowCount } = info;
  const positionPaths = positionKeys.map(k => `${key}.positions.${k}`);
  const toPaths = (kind, count) =>
    range(count).map(ix => `${key}.${kind}s.${kind}${ix + 1}`);
  const flowPaths = toPaths('flow', flowCount);
  const contents = fromEntries([
    [key, info],
    ...positionPaths.map(p => [p, storage.getDeserialized(p).at(-1)]),
    ...flowPaths.map(p => [p, storage.getDeserialized(p)]),
  ]);
  return { contents, positionPaths, flowPaths };
};

test('open portfolio with USDN position', async t => {
  const { trader1, common } = await setupTrader(t);
  const { usdc, poc26 } = common.brands;

  const doneP = trader1.openPortfolio(
    t,
    {
      USDN: usdc.units(3_333),
      NobleFees: usdc.make(100n),
      Access: poc26.make(1n),
    },
    { destinationEVMChain: 'Ethereum' },
  );

  // ack IBC transfer for forward
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);

  const done = await doneP;
  const result = done.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');
  t.like(result.publicSubscribers, {
    portfolio: {
      description: 'Portfolio',
      storagePath: 'orchtest.portfolios.portfolio0',
    },
  });
  t.is(keys(result.publicSubscribers).length, 1);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);
  const { contents, positionPaths, flowPaths } = getPortfolioInfo(
    storagePath,
    common.bootstrap.storage,
  );
  t.snapshot(contents, 'vstorage');
  t.log(
    'I can see where my money is:',
    positionPaths.map(p => contents[p].accountId),
  );
  t.is(contents[positionPaths[0]].accountId, `cosmos:noble-1:cosmos1test`);
  t.is(
    contents[storagePath].accountIdByChain['agoric'],
    `cosmos:agoric-3:${localAccount0}`,
    'LCA',
  );
  t.snapshot(done.payouts, 'refund payouts');
});

test('open a portfolio with Aave position', async t => {
  const { trader1, common } = await setupTrader(t);
  const { usdc, poc26 } = common.brands;

  const actualP = trader1.openPortfolio(
    t,
    {
      Access: poc26.make(1n),
      AaveAccount: usdc.make(100n), // fee
      AaveGmp: usdc.make(100n), // fee
      Aave: usdc.units(3_333),
    },
    { destinationEVMChain: 'Ethereum' },
  );
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  console.log('ackd send to Axelar to create account');

  await simulateUpcallFromAxelar(common.mocks.transferBridge).then(() =>
    simulateCCTPAck(common.utils).finally(() =>
      simulateAckTransferToAxelar(common.utils),
    ),
  );

  const actual = await actualP;
  const result = actual.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');

  t.is(keys(result.publicSubscribers).length, 1);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);
  const { contents } = getPortfolioInfo(storagePath, common.bootstrap.storage);
  t.snapshot(contents, 'vstorage');
  t.snapshot(actual.payouts, 'refund payouts');
});

test('open a portfolio with Compound position', async t => {
  const { trader1, common } = await setupTrader(t);
  const { usdc, poc26 } = common.brands;

  const actualP = trader1.openPortfolio(
    t,
    {
      Access: poc26.make(1n),
      CompoundAccount: usdc.make(100n), // fee
      CompoundGmp: usdc.make(100n), // fee
      Compound: usdc.units(3_333),
    },
    { destinationEVMChain: 'Ethereum' },
  );
  await eventLoopIteration(); // let IBC message go out
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  console.log('ackd send to Axelar to create account');

  await simulateUpcallFromAxelar(common.mocks.transferBridge).then(() =>
    simulateCCTPAck(common.utils).finally(() =>
      simulateAckTransferToAxelar(common.utils),
    ),
  );

  const actual = await actualP;
  const result = actual.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');

  t.is(keys(result.publicSubscribers).length, 1);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);
  const { contents } = getPortfolioInfo(storagePath, common.bootstrap.storage);
  t.snapshot(contents, 'vstorage');
  t.snapshot(actual.payouts, 'refund payouts');
});

test('open portfolio with USDN, Aave positions', async t => {
  const { trader1, common } = await setupTrader(t);
  const { usdc, poc26 } = common.brands;

  const doneP = trader1.openPortfolio(
    t,
    {
      Access: poc26.make(1n),
      AaveAccount: usdc.make(100n), // fee
      AaveGmp: usdc.make(100n), // fee
      Aave: usdc.units(3_333),
    },
    { destinationEVMChain: 'Ethereum' },
  );
  await eventLoopIteration(); // let outgoing IBC happen
  console.log('openPortfolio, eventloop');
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  console.log('ackd send to noble');

  const ackNP = await simulateUpcallFromAxelar(
    common.mocks.transferBridge,
  ).then(() =>
    simulateCCTPAck(common.utils).finally(() =>
      simulateAckTransferToAxelar(common.utils),
    ),
  );

  await eventLoopIteration(); // let bridge I/O happen

  const [done] = await Promise.all([doneP, ackNP]);
  const result = done.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');

  t.is(keys(result.publicSubscribers).length, 1);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);
  const { contents } = getPortfolioInfo(storagePath, common.bootstrap.storage);
  t.snapshot(contents, 'vstorage');
  t.snapshot(done.payouts, 'refund payouts');
});
