// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { Far } from '@agoric/marshal';

import makeStore from '@agoric/store';
import { makeNotifier } from '@agoric/notifier';
import { setup } from '../setupBasicMints';
import { makeZcfSeatAdminKit } from '../../../src/contractFacet/seat';

import {
  defaultAcceptanceMsg,
  satisfies,
  trade,
} from '../../../src/contractSupport';

test('ZoeHelpers messages', t => {
  t.is(
    defaultAcceptanceMsg,
    `The offer has been accepted. Once the contract has been completed, please check your payout`,
  );
});

function makeMockTradingZcfBuilder() {
  const offers = makeStore('offerHandle');
  const allocs = makeStore('offerHandle');
  const reallocatedStagings = [];

  return Far('mockTradingZcfBuilder', {
    addOffer: (keyword, offer) => offers.init(keyword, offer),
    addAllocation: (keyword, alloc) => allocs.init(keyword, alloc),
    build: () =>
      Far('mockZCF', {
        getZoeService: () => {},
        reallocate: (...seatStagings) => {
          reallocatedStagings.push(...seatStagings);
        },
        getReallocatedStagings: () => reallocatedStagings,
      }),
  });
}

test('ZoeHelpers satisfies blank proposal', t => {
  const { moola } = setup();
  const fakeZcfSeat = Far('fakeZcfSeat', {
    getCurrentAllocation: () => harden({ Asset: moola(10) }),
    getProposal: () => harden({}),
  });
  const mockZCFBuilder = makeMockTradingZcfBuilder();
  const mockZCF = mockZCFBuilder.build();
  t.truthy(
    satisfies(mockZCF, fakeZcfSeat, { Gift: moola(3) }),
    `giving anything to a blank proposal is satisifying`,
  );
});

test('ZoeHelpers satisfies simple proposal', t => {
  const { moola, simoleans } = setup();
  const fakeZcfSeat = Far('fakeZcfSeat', {
    getCurrentAllocation: () => harden({ Asset: moola(10) }),
    getProposal: () => harden({ want: { Desire: moola(30) } }),
  });
  const mockZCFBuilder = makeMockTradingZcfBuilder();
  const mockZCF = mockZCFBuilder.build();
  t.falsy(
    satisfies(mockZCF, fakeZcfSeat, { Desire: moola(3) }),
    `giving less than specified to a proposal is not satisifying`,
  );
  t.falsy(
    satisfies(mockZCF, fakeZcfSeat, { Gift: moola(3) }),
    `giving other than what's specified to a proposal is not satisifying`,
  );
  t.truthy(
    satisfies(mockZCF, fakeZcfSeat, { Desire: moola(30) }),
    `giving exactly what's proposed is satisifying`,
  );
  t.truthy(
    satisfies(mockZCF, fakeZcfSeat, { Desire: moola(30), Gift: simoleans(1) }),
    `giving extras beyond what's proposed is satisifying`,
  );
  t.truthy(
    satisfies(mockZCF, fakeZcfSeat, { Desire: moola(40) }),
    `giving more than what's proposed is satisifying`,
  );
});

test('ZoeHelpers satisfies() with give', t => {
  const { moola, bucks } = setup();
  const fakeZcfSeat = Far('fakeZcfSeat', {
    getCurrentAllocation: () => harden({ Charge: moola(30) }),
    getProposal: () =>
      harden({ give: { Charge: moola(30) }, want: { Desire: bucks(5) } }),
  });
  const mockZCFBuilder = makeMockTradingZcfBuilder();
  const mockZCF = mockZCFBuilder.build();
  t.falsy(
    satisfies(mockZCF, fakeZcfSeat, { Charge: moola(0n), Desire: bucks(1) }),
    `providing neither give nor want is not satisfying`,
  );
  t.falsy(
    satisfies(mockZCF, fakeZcfSeat, { Charge: moola(30) }),
    `providing less than what's wanted is not satisfying`,
  );
  t.truthy(
    satisfies(mockZCF, fakeZcfSeat, { Charge: moola(0n), Desire: bucks(40) }),
    `providing more than what's wanted is satisfying`,
  );
  t.truthy(
    satisfies(mockZCF, fakeZcfSeat, { Desire: bucks(40), Charge: moola(3) }),
    `providing what's wanted makes it possible to reduce give`,
  );
});

const makeMockZcfSeatAdmin = (proposal, initialAllocation, getAmountMath) => {
  const allSeatStagings = new WeakSet();
  const mockZoeSeatAdmin = Far('mockZoeSeatAdmin', {});
  const notifier = makeNotifier();
  const { zcfSeat: actual } = makeZcfSeatAdminKit(
    allSeatStagings,
    mockZoeSeatAdmin,
    { proposal, initialAllocation, notifier },
    getAmountMath,
  );
  let hasExited = false;
  const mockSeat = Far('mockSeat', {
    isOfferSafe: actual.isOfferSafe,
    getCurrentAllocation: actual.getCurrentAllocation,
    getProposal: () => proposal,
    stage: actual.stage,
    hasExited: () => hasExited,
    exit: () => {
      hasExited = true;
    },
  });
  return mockSeat;
};

test('ZoeHelpers trade ok', t => {
  const { moola, simoleans } = setup();
  const leftProposal = {
    give: { Asset: moola(10) },
    want: { Bid: simoleans(4) },
    exit: { onDemand: null },
  };
  const leftAlloc = { Asset: moola(10) };
  const leftZcfSeat = makeMockZcfSeatAdmin(leftProposal, leftAlloc);
  const rightProposal = {
    give: { Money: simoleans(6) },
    want: { Items: moola(7) },
    exit: { onDemand: null },
  };

  const rightAlloc = { Money: simoleans(6) };
  const rightZcfSeat = makeMockZcfSeatAdmin(rightProposal, rightAlloc);
  const mockZCFBuilder = makeMockTradingZcfBuilder();
  const mockZCF = mockZCFBuilder.build();
  t.notThrows(() =>
    trade(
      mockZCF,
      {
        seat: leftZcfSeat,
        gains: { Bid: simoleans(4) },
        losses: { Asset: moola(7) },
      },
      {
        seat: rightZcfSeat,
        gains: { Items: moola(7) },
        losses: { Money: simoleans(4) },
      },
    ),
  );
  t.deepEqual(mockZCF.getReallocatedStagings().length, 2, `both reallocated`);
  t.deepEqual(
    mockZCF.getReallocatedStagings()[0].getStagedAllocation(),
    { Asset: moola(3), Bid: simoleans(4) },
    'left gets what she wants',
  );
  t.deepEqual(
    mockZCF.getReallocatedStagings()[1].getStagedAllocation(),
    { Items: moola(7), Money: simoleans(2) },
    'right gets what he wants',
  );
  t.not(leftZcfSeat.hasExited(), 'Trade should not cause seats to exit');
  t.not(rightZcfSeat.hasExited(), 'Trade should not cause seats to exit');
});

test('ZoeHelpers trade same seat', t => {
  const { moola, simoleans } = setup();
  const leftProposal = {
    give: { Asset: moola(10) },
    want: { Bid: simoleans(4) },
    exit: { onDemand: null },
  };
  const leftAlloc = { Asset: moola(10) };
  const leftZcfSeat = makeMockZcfSeatAdmin(leftProposal, leftAlloc);

  const mockZCFBuilder = makeMockTradingZcfBuilder();
  const mockZCF = mockZCFBuilder.build();
  t.throws(
    () =>
      trade(
        mockZCF,
        {
          seat: leftZcfSeat,
          gains: { Bid: simoleans(4) },
          losses: { Asset: moola(7) },
        },
        {
          seat: leftZcfSeat,
          gains: { Items: moola(7) },
          losses: { Money: simoleans(4) },
        },
      ),
    { message: 'a seat cannot trade with itself' },
    'seats must be different',
  );
  t.not(leftZcfSeat.hasExited(), 'Trade should not cause seats to exit');
});
