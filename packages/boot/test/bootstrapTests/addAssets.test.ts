/**
 * @file tests of adding an asset to the vaultFactory.
 * Checks that auctions update correctly.
 */
import type { TestFn } from 'ava';

import {
  type LiquidationTestContext,
  makeLiquidationTestContext,
} from '@aglocal/boot/tools/liquidation.js';
import { makeProposalExtractor } from '@aglocal/boot/tools/supports.js';
import { buildProposal } from '@agoric/cosmic-swingset/tools/test-proposal-utils.ts';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

const test = anyTest as TestFn<
  LiquidationTestContext & {
    getCollateralProposal: (
      name: string,
      id: string,
    ) => Awaited<ReturnType<ReturnType<typeof makeProposalExtractor>>>;
    getNumAuctionBooks: () => number;
  }
>;

const auctioneerPath = 'published.auction';

test.before(async t => {
  const context = await makeLiquidationTestContext(
    { configSpecifier: '@agoric/vm-config/decentral-itest-vaults-config.json' },
    t,
  );
  const proposal = await buildProposal(
    '@agoric/builders/scripts/inter-protocol/add-STARS.js',
  );

  const getCollateralProposal = (name: string, id: string) => {
    // stringify, modify and parse because modifying a deep copy was fragile.
    const proposalJSON = JSON.stringify(proposal);
    const proposalMod = proposalJSON
      .replaceAll('STARS', name)
      .replaceAll('ibc/987C17B1', `ibc/987C17B1${id}`);
    return JSON.parse(proposalMod);
  };

  const getNumAuctionBooks = () =>
    Array.from(context.storage.data.keys()).filter(k =>
      k.startsWith(`${auctioneerPath}.book`),
    ).length;

  t.context = {
    ...context,
    getCollateralProposal,
    getNumAuctionBooks,
  };
});

test.after.always(t => t.context.swingsetTestKit.shutdown());

test.serial('addAsset to quiescent auction', async t => {
  const {
    getNumAuctionBooks,
    storage,
    swingsetTestKit: { advanceTimeBy, evaluateCoreProposal },
  } = t.context;

  const booksBefore = getNumAuctionBooks();

  await evaluateCoreProposal(t.context.getCollateralProposal('COMETS', 'A'));

  await advanceTimeBy(5, 'minutes');

  const booksAfter = getNumAuctionBooks();
  t.is(booksAfter, booksBefore + 1);

  t.like(
    storage.readLatest(`${auctioneerPath}.book${booksAfter - 1}`),
    {
      currentPriceLevel: null,
    },
    'quiescent',
  );
});

test.serial('addAsset to active auction', async t => {
  const {
    getNumAuctionBooks,
    storage,
    swingsetTestKit: { advanceTimeBy, EV, evaluateCoreProposal },
  } = t.context;

  const booksBefore = getNumAuctionBooks();

  t.like(
    storage.readLatest(`${auctioneerPath}.book${booksBefore - 1}`),
    {
      startPrice: null,
    },
    'active',
  );

  const auctioneerKit = await EV.vat('bootstrap').consumeItem('auctioneerKit');
  const schedules = await EV(auctioneerKit.creatorFacet).getSchedule();

  await advanceTimeBy(5, 'minutes');

  t.log('launching proposal');

  await evaluateCoreProposal(t.context.getCollateralProposal('PLANETS', 'B'));
  t.log('proposal executed');

  const schedulesAfter = await EV(auctioneerKit.creatorFacet).getSchedule();
  // TimeMath.compareAbs() can't handle brands processed by kmarshall
  t.truthy(
    schedules.nextAuctionSchedule!.endTime.absValue <
      schedulesAfter.nextAuctionSchedule!.endTime.absValue,
  );

  const booksAfter = getNumAuctionBooks();
  t.is(booksAfter, booksBefore + 1);
});

test.serial('addAsset to auction starting soon', async t => {
  const {
    getNumAuctionBooks,
    swingsetTestKit: { advanceTimeBy, EV, evaluateCoreProposal },
  } = t.context;
  const booksBefore = getNumAuctionBooks();

  const auctioneerKit = await EV.vat('bootstrap').consumeItem('auctioneerKit');
  const schedules = await EV(auctioneerKit.creatorFacet).getSchedule();
  const { nextAuctionSchedule } = schedules;
  assert(nextAuctionSchedule);
  await advanceTimeBy(5, 'minutes');

  await evaluateCoreProposal(t.context.getCollateralProposal('MOONS', 'C'));

  const schedulesAfter = await EV(auctioneerKit.creatorFacet).getSchedule();
  t.truthy(
    schedules.nextAuctionSchedule!.endTime.absValue <
      schedulesAfter.nextAuctionSchedule!.endTime.absValue,
  );

  const booksAfter = getNumAuctionBooks();
  t.is(booksAfter, booksBefore + 1);
});
