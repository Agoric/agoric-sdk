import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import type { Zone } from '@agoric/zone';
import { PendingTxStatus } from '../../src/constants.js';
import { prepareSettler } from '../../src/exos/settler.js';
import { prepareStatusManager } from '../../src/exos/status-manager.js';
import type { CctpTxEvidence } from '../../src/types.js';
import { makeFeeTools } from '../../src/utils/fees.js';
import { MockCctpTxEvidences, MockVTransferEvents } from '../fixtures.js';
import { makeTestLogger, prepareMockOrchAccounts } from '../mocks.js';
import { commonSetup } from '../supports.js';

const mockZcf = (zone: Zone) => {
  const callLog = [] as any[];

  const makeSeatKit = zone.exoClassKit('MockSeatKit', undefined, () => ({}), {
    zcfSeat: {
      getCurrentAllocation() {
        return {};
      },
    },
    userSeat: {},
  });

  const zcf = zone.exo('MockZCF', undefined, {
    atomicRearrange(parts) {
      callLog.push({ method: 'atomicRearrange', parts });
    },
    makeEmptySeatKit() {
      const kit = makeSeatKit() as unknown as ZcfSeatKit;
      return kit;
    },
  });
  return { zcf, callLog };
};

const makeTestContext = async t => {
  const common = await commonSetup(t);
  const { rootZone: zone } = common.bootstrap;
  const { log, inspectLogs } = makeTestLogger(t.log);
  const statusManager = prepareStatusManager(
    zone.subZone('status-manager'),
    async () => common.commonPrivateArgs.storageNode.makeChildNode('status'),
    { log },
  );
  const { zcf, callLog } = mockZcf(zone.subZone('Mock ZCF'));

  const { rootZone, vowTools } = common.bootstrap;
  const { usdc } = common.brands;
  const mockAccounts = prepareMockOrchAccounts(rootZone.subZone('accounts'), {
    vowTools,
    log: t.log,
    usdc,
  });

  const mockWithdrawToSeat = (account, seat, amounts) => {
    callLog.push(
      harden({
        function: 'withdrawToSeat',
        account,
        allocations: seat.getCurrentAllocation(),
        amounts,
      }),
    );
    return vowTools.asVow(() => {});
  };

  const { chainHub } = common.facadeServices;
  chainHub.registerChain('dydx', fetchedChainInfo.dydx);
  chainHub.registerChain('osmosis', fetchedChainInfo.osmosis);
  const makeSettler = prepareSettler(zone.subZone('settler'), {
    statusManager,
    USDC: usdc.brand,
    zcf,
    withdrawToSeat: mockWithdrawToSeat,
    feeConfig: common.commonPrivateArgs.feeConfig,
    vowTools: common.bootstrap.vowTools,
    chainHub,
    log,
  });

  const defaultSettlerParams = harden({
    sourceChannel:
      fetchedChainInfo.agoric.connections['noble-1'].transferChannel
        .counterPartyChannelId,
    remoteDenom: 'uusdc',
  });

  const simulate = harden({
    advance: (evidence?: CctpTxEvidence) => {
      const cctpTxEvidence: CctpTxEvidence = {
        ...MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
        ...evidence,
      };
      t.log('Mock CCTP Evidence:', cctpTxEvidence);
      t.log('Pretend we initiated advance, mark as `ADVANCED`');
      statusManager.advance(cctpTxEvidence);
      const { forwardingAddress, amount } = cctpTxEvidence.tx;
      statusManager.advanceOutcome(forwardingAddress, BigInt(amount), true);

      return cctpTxEvidence;
    },

    observe: (evidence?: CctpTxEvidence) => {
      const cctpTxEvidence: CctpTxEvidence = {
        ...MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
        ...evidence,
      };
      t.log('Mock CCTP Evidence:', cctpTxEvidence);
      t.log('Pretend we `OBSERVED`');
      statusManager.observe(cctpTxEvidence);

      return cctpTxEvidence;
    },
  });

  const repayer = zone.exo('Repayer Mock', undefined, {
    repay(fromSeat: ZCFSeat, amounts: AmountKeywordRecord) {
      callLog.push(harden({ method: 'repay', fromSeat, amounts }));
    },
  });

  return {
    common,
    makeSettler,
    statusManager,
    defaultSettlerParams,
    simulate,
    repayer,
    peekCalls: () => harden([...callLog]),
    inspectLogs,
    accounts: mockAccounts,
    storage: common.bootstrap.storage,
  };
};

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

test.beforeEach(async t => (t.context = await makeTestContext(t)));

test('happy path: disburse to LPs; StatusManager removes tx', async t => {
  const {
    common,
    makeSettler,
    statusManager,
    defaultSettlerParams,
    repayer,
    simulate,
    accounts,
    peekCalls,
  } = t.context;
  const { usdc } = common.brands;
  const { feeConfig } = common.commonPrivateArgs;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });

  const cctpTxEvidence = simulate.advance();
  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [{ ...cctpTxEvidence, status: PendingTxStatus.Advanced }],
    'statusManager shows this tx advanced',
  );

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.log('Funds were disbursed to LP.');
  const calls = peekCalls();
  t.is(calls.length, 3);
  const [withdraw, rearrange, repay] = calls;

  t.deepEqual(
    withdraw,
    {
      function: 'withdrawToSeat',
      account: accounts.settlement.account,
      allocations: {},
      amounts: { In: usdc.units(150) },
    },
    '1. settler called withdrawToSeat',
  );

  // see also AGORIC_PLUS_OSMO in fees.test.ts
  const In = usdc.units(150);
  const expectedSplit = makeFeeTools(feeConfig).calculateSplit(In);
  t.deepEqual(expectedSplit, {
    ContractFee: usdc.make(600000n),
    PoolFee: usdc.make(2400001n),
    Principal: usdc.make(146999999n),
  });

  t.like(
    rearrange,
    { method: 'atomicRearrange' },
    '2. settler called atomicRearrange ',
  );
  t.is(rearrange.parts.length, 1);
  const [s1, s2, a1, a2] = rearrange.parts[0];
  t.is(s1, s2, 'src and dest seat are the same');
  t.deepEqual([a1, a2], [{ In }, expectedSplit]);

  t.like(
    repay,
    {
      method: 'repay',
      amounts: expectedSplit,
    },
    '3. settler called repay() on liquidity pool repayer facet',
  );
  t.is(repay.fromSeat, s1);

  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [],
    'SETTLED entry removed from StatusManger',
  );
  await eventLoopIteration();
  const vstorage = t.context.storage.data;
  t.is(
    vstorage.get(`mockChainStorageRoot.status.${cctpTxEvidence.txHash}`),
    'DISBURSED',
  );
});

test('slow path: forward to EUD; remove pending tx', async t => {
  const {
    common,
    makeSettler,
    statusManager,
    defaultSettlerParams,
    repayer,
    simulate,
    accounts,
    peekCalls,
  } = t.context;
  const { usdc } = common.brands;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });

  const cctpTxEvidence = simulate.observe();
  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [{ ...cctpTxEvidence, status: PendingTxStatus.Observed }],
    'statusManager shows this tx is only observed',
  );

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.log('funds are forwarded; no interaction with LP');
  t.deepEqual(peekCalls(), []);
  t.deepEqual(accounts.settlement.callLog, [
    [
      'transfer',
      {
        chainId: 'osmosis-1',
        encoding: 'bech32',
        value: 'osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
      },
      usdc.units(150),
    ],
  ]);

  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [],
    'SETTLED entry removed from StatusManger',
  );
  const vstorage = t.context.storage.data;
  t.is(
    vstorage.get(`mockChainStorageRoot.status.${cctpTxEvidence.txHash}`),
    'FORWARDED',
  );
});

test('Settlement for unknown transaction', async t => {
  const {
    common,
    makeSettler,
    defaultSettlerParams,
    repayer,
    accounts,
    peekCalls,
    inspectLogs,
  } = t.context;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.log('Nothing was transferrred');
  t.deepEqual(peekCalls(), []);
  t.deepEqual(accounts.settlement.callLog, []);
  t.like(inspectLogs(), [
    ['config', { sourceChannel: 'channel-21' }],
    ['upcall event'],
    ['dequeued', undefined],
    [
      '⚠️ tap: no status for ',
      'noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelqkd',
      150000000n,
    ],
  ]);
});

test.todo("StatusManager does not receive update when we can't settle");
