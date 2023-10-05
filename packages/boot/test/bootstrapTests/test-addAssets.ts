import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';

import { TimeMath } from '@agoric/time';
import {
  LiquidationTestContext,
  makeLiquidationTestContext,
} from './liquidation.ts';

const test = anyTest as TestFn<LiquidationTestContext>;

const auctioneerPath = 'published.auction';

test.before(async t => {
  t.context = await makeLiquidationTestContext(t);
  const proposal = await t.context.buildProposal({
    package: 'builders',
    packageScriptName: 'build:add-STARS-proposal',
  });

  t.log('installing proposal');
  // share a single proposal so tests don't stomp on each other's files; It has
  // to be edited by each so as not to re-use keywords.
  for await (const bundle of proposal.bundles) {
    await t.context.controller.validateAndInstallBundle(bundle);
  }
  t.log('installed', proposal.bundles.length, 'bundles');
  // @ts-expect-error override
  t.context.proposal = proposal;
  t.log('installed', proposal.bundles.length, 'bundles');
});

test.after.always(t => {
  // This will fail if a subset of tests are run. It detects that three
  // collaterals were added to the auction after ATOM.
  t.like(t.context.readLatest(`${auctioneerPath}.book3`), {
    currentPriceLevel: null,
  });
  return t.context.shutdown && t.context.shutdown();
});

test('addAsset to quiescent auction', async t => {
  const {
    advanceTimeTo,
    readLatest,
    // @ts-expect-error override
    proposal,
  } = t.context;

  // stringify, modify and parse because modifying a deep copy was fragile.
  const proposalJSON = JSON.stringify(proposal);
  const proposalMod = proposalJSON.replaceAll('STARS', 'COMETS');
  const proposalNew = JSON.parse(proposalMod);

  const bridgeMessage = {
    type: 'CORE_EVAL',
    evals: proposalNew.evals,
  };

  const { EV } = t.context.runUtils;

  const auctioneerKit = await EV.vat('bootstrap').consumeItem('auctioneerKit');
  const schedules = await EV(auctioneerKit.creatorFacet).getSchedule();
  const { liveAuctionSchedule, nextAuctionSchedule } = schedules;
  const nextEndTime = liveAuctionSchedule
    ? liveAuctionSchedule.endTime
    : nextAuctionSchedule.endTime;
  const fiveMinutes = harden({
    relValue: 5n * 60n,
    timerBrand: nextEndTime.timerBrand,
  });
  const nextQuiescentTime = TimeMath.addAbsRel(nextEndTime, fiveMinutes);
  await advanceTimeTo(nextQuiescentTime);

  const coreEvalBridgeHandler = await EV.vat('bootstrap').consumeItem(
    'coreEvalBridgeHandler',
  );
  await EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);
  t.log('add-STARS proposal executed');

  t.like(readLatest(`${auctioneerPath}.book1`), {
    currentPriceLevel: null,
  });
});

test('addAsset to active auction', async t => {
  const {
    advanceTimeTo,
    readLatest,
    // @ts-expect-error override
    proposal,
  } = t.context;
  const { EV } = t.context.runUtils;

  t.like(readLatest(`${auctioneerPath}.book0`), { startPrice: null });

  const auctioneerKit = await EV.vat('bootstrap').consumeItem('auctioneerKit');
  const schedules = await EV(auctioneerKit.creatorFacet).getSchedule();
  const { nextAuctionSchedule } = schedules;
  t.truthy(nextAuctionSchedule);
  const nextStartTime = nextAuctionSchedule.startTime;
  const fiveMinutes = harden({
    relValue: 5n * 60n,
    timerBrand: nextStartTime.timerBrand,
  });
  const futureBusyTime = TimeMath.addAbsRel(nextStartTime, fiveMinutes);

  await advanceTimeTo(futureBusyTime);

  t.log('launching proposal');

  const proposalJSON = JSON.stringify(proposal);
  const proposalMod = proposalJSON
    .replaceAll('STARS', 'PLANETS')
    .replaceAll('ibc/987C17B1', 'ibc/987C17B2');
  const proposalNew = JSON.parse(proposalMod);

  const bridgeMessage = {
    type: 'CORE_EVAL',
    evals: proposalNew.evals,
  };
  t.log({ bridgeMessage });

  const coreEvalBridgeHandler = await EV.vat('bootstrap').consumeItem(
    'coreEvalBridgeHandler',
  );
  EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);

  const nextEndTime = nextAuctionSchedule.endTime;
  const afterEndTime = TimeMath.addAbsRel(nextEndTime, fiveMinutes);
  await advanceTimeTo(afterEndTime);

  const schedulesAfter = await EV(auctioneerKit.creatorFacet).getSchedule();
  // TimeMath.compareAbs() complains that the brands don't match
  t.truthy(
    schedules.nextAuctionSchedule.endTime.absValue <
      schedulesAfter.nextAuctionSchedule.endTime.absValue,
  );

  t.like(readLatest(`${auctioneerPath}.book1`), { currentPriceLevel: null });
});

test('addAsset to auction starting soon', async t => {
  const {
    advanceTimeTo,
    // @ts-expect-error override
    proposal,
    readLatest,
  } = t.context;
  const { EV } = t.context.runUtils;

  const auctioneerKit = await EV.vat('bootstrap').consumeItem('auctioneerKit');
  const schedules = await EV(auctioneerKit.creatorFacet).getSchedule();
  const { nextAuctionSchedule } = schedules;
  t.truthy(nextAuctionSchedule);
  const nextStartTime = nextAuctionSchedule.startTime;
  const fiveMinutes = harden({
    relValue: 5n * 60n,
    timerBrand: nextStartTime.timerBrand,
  });
  const tooCloseTime = TimeMath.subtractAbsRel(nextStartTime, fiveMinutes);

  await advanceTimeTo(tooCloseTime);

  const proposalJSON = JSON.stringify(proposal);
  const proposalMod = proposalJSON
    .replaceAll('STARS', 'MOONS')
    .replaceAll('ibc/987C17B1', 'ibc/987C17B3');
  const proposalNew = JSON.parse(proposalMod);

  t.log('launching proposal');
  const bridgeMessage = {
    type: 'CORE_EVAL',
    evals: proposalNew.evals,
  };
  t.log({ bridgeMessage });

  const coreEvalBridgeHandler = await EV.vat('bootstrap').consumeItem(
    'coreEvalBridgeHandler',
  );
  EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);

  const nextEndTime = nextAuctionSchedule.endTime;
  const afterEndTime = TimeMath.addAbsRel(nextEndTime, fiveMinutes);
  await advanceTimeTo(afterEndTime);

  t.log('add-STARS proposal executed');

  const schedulesAfter = await EV(auctioneerKit.creatorFacet).getSchedule();
  t.truthy(
    schedules.nextAuctionSchedule.endTime.absValue <
      schedulesAfter.nextAuctionSchedule.endTime.absValue,
  );
  t.like(readLatest(`${auctioneerPath}.book1`), { currentPriceLevel: null });
});
