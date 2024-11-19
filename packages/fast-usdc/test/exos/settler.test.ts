import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import type { Zone } from '@agoric/zone';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { PendingTxStatus } from '../../src/constants.js';
import { prepareSettler } from '../../src/exos/settler.js';
import { prepareStatusManager } from '../../src/exos/status-manager.js';
import type { CctpTxEvidence } from '../../src/types.js';
import { MockCctpTxEvidences, MockVTransferEvents } from '../fixtures.js';
import { prepareMockOrchAccounts } from '../mocks.js';
import { commonSetup, provideDurableZone } from '../supports.js';
import { makeFeeTools } from '../../src/utils/fees.js';

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
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

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

  const makeSettler = prepareSettler(zone.subZone('settler'), {
    statusManager,
    USDC: usdc.brand,
    zcf,
    withdrawToSeat: mockWithdrawToSeat,
    feeConfig: common.commonPrivateArgs.feeConfig,
    vowTools: common.bootstrap.vowTools,
  });

  const defaultSettlerParams = harden({
    sourceChannel:
      fetchedChainInfo.agoric.connections['noble-1'].transferChannel
        .counterPartyChannelId,
    remoteDenom: 'uusdc',
  });

  const simulateAdvance = (evidence?: CctpTxEvidence) => {
    const cctpTxEvidence: CctpTxEvidence = {
      ...MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
      ...evidence,
    };
    t.log('Mock CCTP Evidence:', cctpTxEvidence);
    t.log('Pretend we initiated advance, mark as `ADVANCED`');
    statusManager.advance(cctpTxEvidence);

    return cctpTxEvidence;
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
    simulateAdvance,
    repayer,
    peekCalls: () => harden([...callLog]),
    accounts: mockAccounts,
  };
};

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

test.before(async t => (t.context = await makeTestContext(t)));

test('happy path: disburse to LPs; StatusManager removes tx', async t => {
  const {
    common,
    makeSettler,
    statusManager,
    defaultSettlerParams,
    repayer,
    simulateAdvance,
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

  const cctpTxEvidence = simulateAdvance();
  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [{ ...cctpTxEvidence, status: PendingTxStatus.Advanced }],
    'statusManager shows this tx advanced',
  );

  t.log('Simulate incoming IBC settlement');
  void settler.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.log('review settler interactions with other components');
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
  // TODO, confirm vstorage write for TxStatus.SETTLED
});

test.todo("StatusManager does not receive update when we can't settle");

test.todo('Observed -> Settle flow');
