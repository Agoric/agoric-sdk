import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { Far } from '@endo/marshal';

import { makeScalarMapStore } from '@agoric/store';
import { setup } from '../setupBasicMints.js';

import {
  defaultAcceptanceMsg,
  satisfies,
} from '../../../src/contractSupport/index.js';

test('ZoeHelpers messages', t => {
  t.is(
    defaultAcceptanceMsg,
    `The offer has been accepted. Once the contract has been completed, please check your payout`,
  );
});

function makeMockTradingZcfBuilder() {
  const offers = makeScalarMapStore('offerHandle');
  const allocs = makeScalarMapStore('offerHandle');
  const reallocatedStagings = [];

  return Far('mockTradingZcfBuilder', {
    addOffer: (keyword, offer) => offers.init(keyword, offer),
    addAllocation: (keyword, alloc) => allocs.init(keyword, alloc),
    /** @returns {ZCF} */
    build: () =>
      Far('mockZCF', {
        // @ts-expect-error mock
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
  /** @type {ZCFSeat} */
  // @ts-expect-error cast
  const fakeZcfSeat = Far('fakeZcfSeat', {
    getCurrentAllocation: () => harden({ Asset: moola(10n) }),
    getProposal: () => harden({}),
  });
  const mockZCFBuilder = makeMockTradingZcfBuilder();
  const mockZCF = mockZCFBuilder.build();
  t.truthy(
    satisfies(mockZCF, fakeZcfSeat, { Gift: moola(3n) }),
    `giving anything to a blank proposal is satisifying`,
  );
});

test('ZoeHelpers satisfies simple proposal', t => {
  const { moola, simoleans } = setup();
  /** @type {ZCFSeat} */
  // @ts-expect-error cast
  const fakeZcfSeat = Far('fakeZcfSeat', {
    getCurrentAllocation: () => harden({ Asset: moola(10n) }),
    getProposal: () => harden({ want: { Desire: moola(30n) } }),
  });
  const mockZCFBuilder = makeMockTradingZcfBuilder();
  const mockZCF = mockZCFBuilder.build();
  t.falsy(
    satisfies(mockZCF, fakeZcfSeat, { Desire: moola(3n) }),
    `giving less than specified to a proposal is not satisifying`,
  );
  t.falsy(
    satisfies(mockZCF, fakeZcfSeat, { Gift: moola(3n) }),
    `giving other than what's specified to a proposal is not satisifying`,
  );
  t.truthy(
    satisfies(mockZCF, fakeZcfSeat, { Desire: moola(30n) }),
    `giving exactly what's proposed is satisifying`,
  );
  t.truthy(
    satisfies(mockZCF, fakeZcfSeat, {
      Desire: moola(30n),
      Gift: simoleans(1n),
    }),
    `giving extras beyond what's proposed is satisifying`,
  );
  t.truthy(
    satisfies(mockZCF, fakeZcfSeat, { Desire: moola(40n) }),
    `giving more than what's proposed is satisifying`,
  );
});

test('ZoeHelpers satisfies() with give', t => {
  const { moola, bucks } = setup();
  /** @type {ZCFSeat} */
  // @ts-expect-error cast
  const fakeZcfSeat = Far('fakeZcfSeat', {
    getCurrentAllocation: () => harden({ Charge: moola(30n) }),
    getProposal: () =>
      harden({ give: { Charge: moola(30n) }, want: { Desire: bucks(5n) } }),
  });
  const mockZCFBuilder = makeMockTradingZcfBuilder();
  const mockZCF = mockZCFBuilder.build();
  t.falsy(
    satisfies(mockZCF, fakeZcfSeat, { Charge: moola(0n), Desire: bucks(1n) }),
    `providing neither give nor want is not satisfying`,
  );
  t.falsy(
    satisfies(mockZCF, fakeZcfSeat, { Charge: moola(30n) }),
    `providing less than what's wanted is not satisfying`,
  );
  t.truthy(
    satisfies(mockZCF, fakeZcfSeat, { Charge: moola(0n), Desire: bucks(40n) }),
    `providing more than what's wanted is satisfying`,
  );
  t.truthy(
    satisfies(mockZCF, fakeZcfSeat, { Desire: bucks(40n), Charge: moola(3n) }),
    `providing what's wanted makes it possible to reduce give`,
  );
});
