import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { E } from '@endo/far';
import { passStyleOf } from '@endo/pass-style';
import { AmountMath } from '@agoric/ertp';
import { matches } from '@endo/patterns';
import {
  prepareLiquidityPoolKit,
  type LiquidityPoolKit,
} from '../../src/exos/liquidity-pool.js';
import { makeProposalShapes } from '../../src/type-guards.js';
import { mockZcf } from '../mocks.js';
import { commonSetup } from '../supports.js';

const setupLP = async (common: Awaited<ReturnType<typeof commonSetup>>) => {
  const { rootZone } = common.bootstrap;
  const zcfTools = mockZcf(rootZone.subZone('zcf'));
  const { zcf } = zcfTools;
  const zone = rootZone.subZone('fast-usdc');
  const { usdc } = common.brands;
  const { makeRecorderKit } = prepareRecorderKitMakers(
    zone.mapStore('vstorage'),
    defaultMarshaller,
  );
  const makeLP = prepareLiquidityPoolKit(zone, zcf, usdc.brand, {
    makeRecorderKit,
  });
  const shareMint = await zcf.makeZCFMint('PoolShare');
  const PoolSharesRec = shareMint.getIssuerRecord();
  const { brand: PoolShares } = PoolSharesRec;
  const node = common.bootstrap.storage.rootNode.makeChildNode('fast-usdc');
  const lpKit = makeLP(shareMint, node);
  return { lpKit, PoolSharesRec, PoolShares, zcf, zcfTools };
};

test('LP public invitation makers', async t => {
  const common = await commonSetup(t);
  const { usdc } = common.brands;

  const { lpKit, PoolShares, zcfTools } = await setupLP(common);

  const { deposit, withdraw } = makeProposalShapes({
    PoolShares,
    USDC: usdc.brand,
  });

  const toDeposit = await lpKit.public.makeDepositInvitation();
  t.is(passStyleOf(toDeposit), 'remotable');
  const [call0] = zcfTools.callLog;
  t.like(call0, { description: 'Deposit' });
  t.deepEqual(call0.proposalShape, deposit); // use keyEQ?

  const toWithdraw = await lpKit.public.makeWithdrawInvitation();
  t.truthy(toWithdraw);
  const [_, call1] = zcfTools.callLog;
  t.like(call1, { description: 'Withdraw' });
  t.deepEqual(call1.proposalShape, withdraw); // use keyEQ?
});

test('metrics subscriber (toward borrow)', async t => {
  const common = await commonSetup(t);
  const { usdc } = common.brands;
  const { lpKit } = await setupLP(common);

  const emptyMetrics = {
    encumberedBalance: usdc.makeEmpty(),
    shareWorth: {
      numerator: usdc.make(1n),
      denominator: { value: 1n },
    },
    totalBorrows: usdc.makeEmpty(),
    totalContractFees: usdc.makeEmpty(),
    totalPoolFees: usdc.makeEmpty(),
    totalRepays: usdc.makeEmpty(),
  };

  const { poolMetrics } = lpKit.public.getPublicTopics();
  const update = await E(poolMetrics.subscriber).getUpdateSince();
  t.like(update, { value: emptyMetrics });
});

const logAmt = amt => [
  Number(amt.value),
  //   numberWithCommas(Number(amt.value)),
  amt.brand
    .toString()
    .replace(/^\[object Alleged:/, '')
    .replace(/ brand]$/, ''),
];

const { subtract } = AmountMath;
test('toward borrow', async t => {
  const common = await commonSetup(t);
  const { usdc } = common.brands;
  const { lpKit, PoolShares, zcf, zcfTools } = await setupLP(common);
  const shapes = makeProposalShapes({
    PoolShares,
    USDC: usdc.brand,
  });

  const { poolMetrics } = lpKit.public.getPublicTopics();
  let mUpdate = await E(poolMetrics.subscriber).getUpdateSince(); // throw away initial state

  await lpKit.public.makeDepositInvitation();
  const { offerHandler }: { offerHandler: LiquidityPoolKit['depositHandler'] } =
    zcfTools.callLog.find(c => c.description === 'Deposit');
  const { zcfSeat: lpSeatP } = zcf.makeEmptySeatKit();
  const proposal = harden({ give: { USDC: usdc.make(100n) } });
  t.true(matches(proposal, shapes.deposit));
  zcfTools.setAllocation(lpSeatP, proposal.give);
  const r = offerHandler.handle(await lpSeatP, {});
  t.deepEqual(r, undefined);
  t.log('deposited', ...logAmt(proposal.give.USDC));

  mUpdate = await E(poolMetrics.subscriber).getUpdateSince(mUpdate.updateCount);
  const { shareWorth, encumberedBalance } = mUpdate.value;
  t.log('metrics after deposit', { shareWorth, encumberedBalance });
  const dust = usdc.make(1n);
  const poolSeatAllocation = subtract(
    subtract(shareWorth.numerator, encumberedBalance),
    dust,
  );
  t.log('alloc', ...logAmt(poolSeatAllocation));
  const { zcfSeat: destSeat } = zcf.makeEmptySeatKit();
  await t.throws(
    () => lpKit.borrower.borrow(destSeat, { USDC: poolSeatAllocation }),
    { message: /Cannot borrow/ },
    'borrow fails when requested equals pool seat allocation',
  );
});
