import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import type { Zone } from '@agoric/zone';
import { PendingTxStatus, TxStatus } from '../../src/constants.js';
import { prepareSettler, type SettlerKit } from '../../src/exos/settler.js';
import { prepareStatusManager } from '../../src/exos/status-manager.js';
import type { CctpTxEvidence } from '../../src/types.js';
import { makeFeeTools } from '../../src/utils/fees.js';
import {
  MockCctpTxEvidences,
  MockVTransferEvents,
  intermediateRecipient,
} from '../fixtures.js';
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
    common.commonPrivateArgs.storageNode.makeChildNode('txns'),
    { marshaller: defaultMarshaller, log },
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
    intermediateRecipient,
  });

  const makeSimulate = (notifyFacet: SettlerKit['notify']) => {
    const makeEvidence = (evidence?: CctpTxEvidence): CctpTxEvidence =>
      harden({
        ...MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
        ...evidence,
      });

    const makeNotifyInfo = (evidence: CctpTxEvidence) => {
      const { txHash } = evidence;
      const { forwardingAddress, amount } = evidence.tx;
      const { recipientAddress } = evidence.aux;
      const { EUD } = decodeAddressHook(recipientAddress).query;
      if (typeof EUD !== 'string') {
        throw Error(`EUD not found in ${recipientAddress}`);
      }
      const destination = chainHub.makeChainAddress(EUD);
      return harden({
        txHash,
        forwardingAddress,
        fullAmount: usdc.make(amount),
        destination,
      });
    };

    const simulate = harden({
      /**
       * simulate Advancer starting advance
       * @param evidence
       */
      startAdvance: (evidence?: CctpTxEvidence) => {
        const cctpTxEvidence = makeEvidence(evidence);
        t.log('Mock CCTP Evidence:', cctpTxEvidence);
        t.log('Pretend we initiated advance, mark as `ADVANCING`');
        statusManager.advance(cctpTxEvidence);
        return cctpTxEvidence;
      },
      /**
       * Simulate transfer vow settlement (success or failure)
       * @param evidence
       * @param success
       */
      finishAdvance: (evidence: CctpTxEvidence, success = true) => {
        const { Advanced, AdvanceFailed } = TxStatus;
        t.log(`Simulate ${success ? Advanced : AdvanceFailed}`);
        const info = makeNotifyInfo(evidence);
        notifyFacet.notifyAdvancingResult(info, success);
      },
      /**
       * start and finish advance successfully
       * @param evidence
       */
      advance: (evidence?: CctpTxEvidence) => {
        const cctpTxEvidence = simulate.startAdvance(evidence);
        simulate.finishAdvance(cctpTxEvidence, true);
        return cctpTxEvidence;
      },
      /**
       * slow path - e.g. insufficient pool funds
       * @param evidence
       */
      observe: (evidence?: CctpTxEvidence) => {
        const cctpTxEvidence = makeEvidence(evidence);
        t.log('Mock CCTP Evidence:', cctpTxEvidence);
        t.log('Pretend we `OBSERVED` (did not advance)');
        statusManager.observe(cctpTxEvidence);

        return cctpTxEvidence;
      },
    });
    return simulate;
  };

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
    makeSimulate,
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
    makeSimulate,
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
  const simulate = makeSimulate(settler.notify);
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
  const { storage } = t.context;
  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCED' },
    { split: expectedSplit, status: 'DISBURSED' },
  ]);

  // Check deletion of DISBURSED transactions
  statusManager.deleteCompletedTxs();
  await eventLoopIteration();
  t.is(storage.data.get(`fun.txns.${cctpTxEvidence.txHash}`), undefined);
});

test('slow path: forward to EUD; remove pending tx', async t => {
  const {
    common,
    makeSettler,
    statusManager,
    defaultSettlerParams,
    repayer,
    makeSimulate,
    accounts,
    peekCalls,
  } = t.context;
  const { usdc } = common.brands;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });
  const simulate = makeSimulate(settler.notify);
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
      {
        forwardOpts: {
          intermediateRecipient: {
            chainId: 'noble-1',
            encoding: 'bech32',
            value: 'noble1test',
          },
        },
      },
    ],
  ]);

  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [],
    'dequeueStatus entry removed from StatusManger',
  );
  const { storage } = t.context;
  accounts.settlement.transferVResolver.resolve(undefined);
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { status: 'FORWARDED' },
  ]);

  // Check deletion of FORWARDED transactions
  statusManager.deleteCompletedTxs();
  await eventLoopIteration();
  t.is(storage.data.get(`fun.txns.${cctpTxEvidence.txHash}`), undefined);
});

test('Settlement for Advancing transaction (advance succeeds)', async t => {
  const {
    accounts,
    defaultSettlerParams,
    inspectLogs,
    makeSettler,
    repayer,
    makeSimulate,
    statusManager,
    common: {
      brands: { usdc },
      commonPrivateArgs: { feeConfig },
    },
    storage,
  } = t.context;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });
  const simulate = makeSimulate(settler.notify);
  const cctpTxEvidence = simulate.startAdvance();
  const { forwardingAddress, amount } = cctpTxEvidence.tx;

  t.deepEqual(
    statusManager.lookupPending(forwardingAddress, amount),
    [{ ...cctpTxEvidence, status: PendingTxStatus.Advancing }],
    'statusManager shows this tx is Advancing',
  );

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.like(inspectLogs(), [
    ['config', { sourceChannel: 'channel-21' }],
    ['upcall event'],
    ['dequeued', { status: PendingTxStatus.Advancing }],
    ['⚠️ tap: minted while advancing'],
  ]);

  const In = usdc.make(MockCctpTxEvidences.AGORIC_PLUS_OSMO().tx.amount);
  const expectedSplit = makeFeeTools(feeConfig).calculateSplit(In);

  t.log('Simulate advance success');
  simulate.finishAdvance(cctpTxEvidence, true);
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    // { status: 'ADVANCED' }, TODO: not reported by notifyAdvancingResult
    { split: expectedSplit, status: 'DISBURSED' },
  ]);
});

test('Settlement for Advancing transaction (advance fails)', async t => {
  const {
    accounts,
    defaultSettlerParams,
    inspectLogs,
    makeSettler,
    repayer,
    makeSimulate,
    common: {
      brands: { usdc },
    },
    storage,
  } = t.context;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });
  const simulate = makeSimulate(settler.notify);
  const cctpTxEvidence = simulate.startAdvance();

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.like(inspectLogs(), [
    ['config', { sourceChannel: 'channel-21' }],
    ['upcall event'],
    ['dequeued', { status: PendingTxStatus.Advancing }],
    ['⚠️ tap: minted while advancing'],
  ]);

  t.log('Simulate Advance failure (e.g. IBC Timeout)');
  simulate.finishAdvance(cctpTxEvidence, false);
  await eventLoopIteration();

  t.log('Expecting Settler to initiate forward');
  t.like(accounts.settlement.callLog, [
    [
      'transfer',
      {
        value: 'osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
      },
      usdc.units(150),
      {
        forwardOpts: {
          intermediateRecipient: {
            value: 'noble1test',
          },
        },
      },
    ],
  ]);

  t.log('Pretend Forward succeeds');
  accounts.settlement.transferVResolver.resolve(undefined);
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    // { status: 'ADVANCE_FAILED' }, TODO: not reported by notifyAdvancingResult
    { status: 'FORWARDED' },
  ]);
});
