// eslint-disable-next-line import/no-extraneous-dependencies

import '@agoric/install-ses';
import { test } from 'tape-promise/tape';

import makeStore from '@agoric/store';
import { setup } from '../setupBasicMints';

import {
  makeZoeHelpers,
  defaultAcceptanceMsg,
  defaultRejectMsg,
} from '../../../src/contractSupport';

test('ZoeHelpers messages', t => {
  t.plan(2);
  try {
    t.equals(
      defaultAcceptanceMsg,
      `The offer has been accepted. Once the contract has been completed, please check your payout`,
    );
    t.equals(
      defaultRejectMsg,
      `The offer was invalid. Please check your refund.`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

function makeMockZoeBuilder() {
  const offers = makeStore('offerHandle');
  const allocs = makeStore('offerHandle');
  let instanceRecord;
  const amountMathToBrand = makeStore('amountMath');
  const completedHandles = [];
  const reallocatedAmountObjs = [];
  const reallocatedHandles = [];
  let isOfferActive = true;

  return harden({
    addOffer: (keyword, offer) => offers.init(keyword, offer),
    addAllocation: (keyword, alloc) => allocs.init(keyword, alloc),
    setInstanceRecord: newRecord => (instanceRecord = newRecord),
    addBrand: issuerRecord =>
      amountMathToBrand.init(issuerRecord.brand, issuerRecord.amountMath),
    setOffersInactive: () => (isOfferActive = false),
    build: () =>
      harden({
        getInstanceRecord: () => instanceRecord,
        getAmountMath: amountMath => amountMathToBrand.get(amountMath),
        getZoeService: () => {},
        isOfferActive: () => isOfferActive,
        getOffer: handle => offers.get(handle),
        getCurrentAllocation: handle => allocs.get(handle),
        reallocate: (handles, amountObjs) => {
          reallocatedHandles.push(...handles);
          reallocatedAmountObjs.push(...amountObjs);
        },
        complete: handles =>
          handles.map(handle => completedHandles.push(handle)),
        getReallocatedAmountObjs: () => reallocatedAmountObjs,
        getReallocatedHandles: () => reallocatedHandles,
        getCompletedHandles: () => completedHandles,
      }),
  });
}

test('ZoeHelpers assertKeywords', t => {
  t.plan(5);
  const { moolaR, simoleanR } = setup();
  try {
    const mockZCFBuilder = makeMockZoeBuilder();
    mockZCFBuilder.setInstanceRecord({
      issuerKeywordRecord: {
        Asset: moolaR.issuer,
        Price: simoleanR.issuer,
      },
    });

    const mockZCF = mockZCFBuilder.build();
    const { assertKeywords } = makeZoeHelpers(mockZCF);
    t.doesNotThrow(
      () => assertKeywords(['Asset', 'Price']),
      `Asset and Price are the correct keywords`,
    );
    t.doesNotThrow(
      () => assertKeywords(['Price', 'Asset']),
      `Order doesn't matter`,
    );
    t.throws(
      () => assertKeywords(['TokenA', 'TokenB']),
      /were not as expected/,
      `The wrong keywords will throw`,
    );
    t.throws(
      () => assertKeywords(['Asset', 'Price', 'Price2']),
      /were not as expected/,
      `An extra keyword will throw`,
    );
    t.throws(
      () => assertKeywords(['Asset']),
      /were not as expected/,
      `a missing keyword will throw`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

test('ZoeHelpers rejectIfNotProposal', t => {
  t.plan(8);
  const { moola, simoleans } = setup();
  const offerHandles = harden([{}, {}, {}, {}, {}, {}, {}]);
  try {
    const mockZCFBuilder = makeMockZoeBuilder();
    mockZCFBuilder.addOffer(offerHandles[4], {
      proposal: {
        want: { Asset: moola(4) },
        give: { Price: simoleans(16) },
        exit: { Waived: null },
      },
    });
    mockZCFBuilder.addOffer(offerHandles[5], {
      proposal: {
        want: { Asset2: moola(4) },
        give: { Price: simoleans(16) },
        exit: { waived: null },
      },
    });

    const otherOffers = harden({
      proposal: {
        want: { Asset: moola(4) },
        give: { Price: simoleans(16) },
        exit: { onDemand: null },
      },
    });
    // TODO: perhaps mockZCFBuilder could have a default Offer?
    mockZCFBuilder.addOffer(offerHandles[0], otherOffers);
    mockZCFBuilder.addOffer(offerHandles[1], otherOffers);
    mockZCFBuilder.addOffer(offerHandles[2], otherOffers);
    mockZCFBuilder.addOffer(offerHandles[3], otherOffers);
    const mockZCF = mockZCFBuilder.build();
    const { rejectIfNotProposal } = makeZoeHelpers(mockZCF);
    // Vary expected.
    t.doesNotThrow(() =>
      rejectIfNotProposal(
        offerHandles[0],
        harden({
          want: { Asset: null },
          give: { Price: null },
        }),
      ),
    );
    t.throws(
      () =>
        rejectIfNotProposal(
          offerHandles[1],
          harden({
            want: { Assets: null },
            give: { Price: null },
          }),
        ),
      /The offer was invalid. Please check your refund./,
      `had the wrong wants`,
    );
    t.throws(
      () =>
        rejectIfNotProposal(
          offerHandles[2],
          harden({
            want: { Asset: null },
            give: { Price2: null },
          }),
        ),
      /The offer was invalid. Please check your refund./,
      `had the wrong offer`,
    );
    t.throws(
      () =>
        rejectIfNotProposal(
          offerHandles[3],
          harden({
            want: { Asset: null },
            give: { Price: null },
            exit: { Waived: null },
          }),
        ),
      /The offer was invalid. Please check your refund./,
      `had the wrong exit rule`,
    );
    t.deepEquals(
      mockZCF.getCompletedHandles(),
      [offerHandles[1], offerHandles[2], offerHandles[3]],
      `offers 1, 2, 3, (zero-indexed) should be completed`,
    );

    // Now vary the offer.
    t.throws(
      () =>
        rejectIfNotProposal(
          offerHandles[4],
          harden({
            want: { Asset: null },
            give: { Price: null },
            exit: { waived: null },
          }),
        ),
      /The offer was invalid. Please check your refund./,
      `had the wrong exit rule`,
    );
    t.throws(
      () =>
        rejectIfNotProposal(
          offerHandles[5],
          harden({
            want: { Asset: null },
            give: { Price: null },
            exit: { waived: null },
          }),
        ),
      /The offer was invalid. Please check your refund./,
      `had the wrong want`,
    );
    t.deepEquals(
      mockZCF.getCompletedHandles(),
      [
        offerHandles[1],
        offerHandles[2],
        offerHandles[3],
        offerHandles[4],
        offerHandles[5],
      ],
      `offers 1, 2, 3, 4, and 5 (zero indexed) should be completed`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

test('ZoeHelpers checkIfProposal', t => {
  t.plan(3);
  const { moola, simoleans } = setup();
  const handle = {};
  try {
    const mockZCFBuilder = makeMockZoeBuilder();
    mockZCFBuilder.addOffer(handle, {
      proposal: {
        want: { Asset: moola(4) },
        give: { Price: simoleans(16) },
        exit: { onDemand: null },
      },
    });
    const mockZCF = mockZCFBuilder.build();

    const { checkIfProposal } = makeZoeHelpers(mockZCF);
    t.ok(
      checkIfProposal(
        handle,
        harden({
          want: { Asset: null },
          give: { Price: null },
          exit: { onDemand: null },
        }),
      ),
      `want, give, and exit match expected`,
    );
    t.notOk(
      checkIfProposal(
        handle,
        harden({
          want: { Asset2: null },
          give: { Price: null },
        }),
      ),
      `want was not as expected`,
    );
    t.ok(
      checkIfProposal(handle, harden({})),
      `having no expectations passes trivially`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

test('ZoeHelpers checkIfProposal multiple keys', t => {
  t.plan(2);
  const { moola, simoleans, bucks } = setup();
  const handle = {};
  const mockZCFBuilder = makeMockZoeBuilder();
  mockZCFBuilder.addOffer(handle, {
    proposal: {
      want: { Asset: moola(4), Fee: bucks(1) },
      give: { Price: simoleans(16) },
      exit: { onDemand: null },
    },
  });
  mockZCFBuilder.addAllocation(handle, { Asset: moola(10) });
  const mockZCF = mockZCFBuilder.build();

  const { checkIfProposal } = makeZoeHelpers(mockZCF);
  t.ok(
    checkIfProposal(
      handle,
      harden({
        want: { Asset: null, Fee: null },
        give: { Price: null },
        exit: { onDemand: null },
      }),
    ),
    `want, give, and exit match expected`,
  );
  t.ok(
    checkIfProposal(
      handle,
      harden({
        want: { Fee: null, Asset: null },
        give: { Price: null },
        exit: { onDemand: null },
      }),
    ),
    `want (reversed), give, and exit match expected`,
  );
});

test('ZoeHelpers getActiveOffers', t => {
  t.plan(1);
  try {
    // uses its own mock because all it needs is a variant getOffers.
    const mockZCF = harden({
      getZoeService: () => {},
      getOfferStatuses: handles => {
        const [firstHandle, restHandles] = handles;
        return harden({
          active: [firstHandle],
          inactive: restHandles,
        });
      },
      getOffers: handles =>
        handles.map((handle, i) => harden({ handle, id: i })),
    });
    const { getActiveOffers } = makeZoeHelpers(mockZCF);
    const offerHandles = harden([{}, {}]);
    t.deepEquals(
      getActiveOffers(offerHandles),
      harden([{ handle: offerHandles[0], id: 0 }]),
      `active offers gotten`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

test('ZoeHelpers rejectOffer', t => {
  t.plan(4);
  const completedOfferHandles = [];
  try {
    const mockZCF = harden({
      getZoeService: () => {},
      complete: handles => completedOfferHandles.push(...handles),
    });
    const { rejectOffer } = makeZoeHelpers(mockZCF);
    const offerHandles = harden([{}, {}]);
    t.throws(
      () => rejectOffer(offerHandles[0]),
      /Error: The offer was invalid. Please check your refund./,
      `rejectOffer intentionally throws`,
    );
    t.deepEquals(completedOfferHandles, harden([offerHandles[0]]));
    t.throws(
      () => rejectOffer(offerHandles[1], 'offer was wrong'),
      /Error: offer was wrong/,
      `rejectOffer throws with custom msg`,
    );
    t.deepEquals(completedOfferHandles, harden(offerHandles));
  } catch (e) {
    t.assert(false, e);
  }
});

test('ZoeHelpers swap ok', t => {
  t.plan(4);
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const leftOfferHandle = harden({});
  const rightOfferHandle = harden({});
  const cantTradeRightOfferHandle = harden({});
  try {
    const mockZCFBuilder = makeMockZoeBuilder();
    mockZCFBuilder.addBrand(moolaR);
    mockZCFBuilder.addBrand(simoleanR);
    mockZCFBuilder.addAllocation(leftOfferHandle, { Asset: moola(10) });
    mockZCFBuilder.addAllocation(rightOfferHandle, { Price: simoleans(6) });
    mockZCFBuilder.addAllocation(cantTradeRightOfferHandle, {
      Price: simoleans(6),
    });
    mockZCFBuilder.addOffer(leftOfferHandle, {
      proposal: {
        give: { Asset: moola(10) },
        want: { Price: simoleans(4) },
        exit: { onDemand: null },
      },
    });
    mockZCFBuilder.addOffer(rightOfferHandle, {
      proposal: {
        give: { Price: simoleans(6) },
        want: { Asset: moola(7) },
        exit: { onDemand: null },
      },
    });
    mockZCFBuilder.addOffer(cantTradeRightOfferHandle, {
      proposal: {
        give: { Price: simoleans(6) },
        want: { Asset: moola(100) },
        exit: { onDemand: null },
      },
    });
    const mockZCF = mockZCFBuilder.build();
    const { swap } = makeZoeHelpers(mockZCF);
    t.ok(
      swap(
        leftOfferHandle,
        rightOfferHandle,
        'prior offer no longer available',
      ),
    );
    t.deepEquals(
      mockZCF.getReallocatedHandles(),
      harden([leftOfferHandle, rightOfferHandle]),
      `both handles reallocated`,
    );
    t.deepEquals(
      mockZCF.getReallocatedAmountObjs(),
      [
        { Asset: moola(3), Price: simoleans(4) },
        { Price: simoleans(2), Asset: moola(7) },
      ],
      `amounts reallocated passed to reallocate were as expected`,
    );
    t.deepEquals(
      mockZCF.getCompletedHandles(),
      harden([leftOfferHandle, rightOfferHandle]),
      `both handles were completed`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

test('ZoeHelpers swap keep inactive', t => {
  t.plan(4);
  const { moola, simoleans } = setup();
  const leftOfferHandle = harden({});
  const rightOfferHandle = harden({});
  const cantTradeRightOfferHandle = harden({});
  try {
    const mockZCFBuilder = makeMockZoeBuilder();
    mockZCFBuilder.addOffer(leftOfferHandle, {
      proposal: {
        give: { Asset: moola(10) },
        want: { Price: simoleans(4) },
        exit: { onDemand: null },
      },
    });
    mockZCFBuilder.addOffer(rightOfferHandle, {
      proposal: {
        give: { Price: simoleans(6) },
        want: { Asset: moola(7) },
        exit: { onDemand: null },
      },
    });
    mockZCFBuilder.addOffer(cantTradeRightOfferHandle, {
      proposal: {
        give: { Price: simoleans(6) },
        want: { Asset: moola(100) },
        exit: { onDemand: null },
      },
    });
    mockZCFBuilder.setOffersInactive();
    const mockZCF = mockZCFBuilder.build();
    const { swap } = makeZoeHelpers(mockZCF);
    t.throws(
      () =>
        swap(
          leftOfferHandle,
          rightOfferHandle,
          'prior offer no longer available',
        ),
      /Error: prior offer no longer available/,
      `throws if keepHandle offer is not active`,
    );
    const reallocatedHandles = mockZCF.getReallocatedHandles();
    t.deepEquals(reallocatedHandles, harden([]), `nothing reallocated`);
    const reallocatedAmountObjs = mockZCF.getReallocatedAmountObjs();
    t.deepEquals(reallocatedAmountObjs, harden([]), `no amounts reallocated`);
    t.deepEquals(
      mockZCF.getCompletedHandles(),
      harden([rightOfferHandle]),
      `only tryHandle (right) was completed`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

test(`ZoeHelpers swap - can't trade with`, t => {
  t.plan(4);
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const leftOfferHandle = harden({});
  const rightOfferHandle = harden({});
  const cantTradeHandle = harden({});

  try {
    const mockZCFBuilder = makeMockZoeBuilder();
    mockZCFBuilder.addBrand(moolaR);
    mockZCFBuilder.addBrand(simoleanR);
    mockZCFBuilder.addOffer(leftOfferHandle, {
      proposal: {
        give: { Asset: moola(10) },
        want: { Price: simoleans(4) },
        exit: { onDemand: null },
      },
    });
    mockZCFBuilder.addOffer(rightOfferHandle, {
      proposal: {
        give: { Price: simoleans(6) },
        want: { Asset: moola(7) },
        exit: { onDemand: null },
      },
    });
    mockZCFBuilder.addOffer(cantTradeHandle, {
      proposal: {
        give: { Price: simoleans(6) },
        want: { Asset: moola(100) },
        exit: { onDemand: null },
      },
    });
    mockZCFBuilder.addAllocation(leftOfferHandle, { Asset: moola(10) });
    mockZCFBuilder.addAllocation(rightOfferHandle, { Price: simoleans(6) });
    mockZCFBuilder.addAllocation(cantTradeHandle, { Price: simoleans(6) });
    const mockZcf = mockZCFBuilder.build();
    const { swap } = makeZoeHelpers(mockZcf);
    t.throws(
      () =>
        swap(
          leftOfferHandle,
          cantTradeHandle,
          'prior offer no longer available',
        ),
      /Error: The offer was invalid. Please check your refund./,
      `throws if can't trade with left and right`,
    );
    const reallocatedHandles = mockZcf.getReallocatedHandles();
    t.deepEquals(reallocatedHandles, harden([]), `nothing reallocated`);
    const reallocatedAmountObjs = mockZcf.getReallocatedAmountObjs();
    t.deepEquals(reallocatedAmountObjs, harden([]), `no amounts reallocated`);
    const completedHandles = mockZcf.getCompletedHandles();
    t.deepEquals(
      completedHandles,
      harden([rightOfferHandle]),
      `only tryHandle (right) was completed`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

test('ZoeHelpers makeEmptyOffer', async t => {
  t.plan(2);
  const { moolaR, simoleanR } = setup();
  const redeemedInvites = [];
  try {
    const offerHandle = harden({});
    const mockZCF = harden({
      getInstanceRecord: () =>
        harden({
          issuerKeywordRecord: {
            Asset: moolaR.issuer,
            Price: simoleanR.issuer,
          },
        }),
      getZoeService: () =>
        harden({
          offer: invite => {
            redeemedInvites.push(invite);
            return Promise.resolve();
          },
        }),
      makeInvitation: offerHook => {
        offerHook(offerHandle);
        return 'anInvite';
      },
    });
    const { makeEmptyOffer } = makeZoeHelpers(mockZCF);
    const result = await makeEmptyOffer();
    t.deepEquals(result, offerHandle, `offerHandle was returned`);
    t.deepEquals(redeemedInvites, harden(['anInvite']), `invite was redeemed`);
  } catch (e) {
    t.assert(false, e);
  }
});

test('ZoeHelpers isOfferSafe', t => {
  t.plan(5);
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const leftOfferHandle = harden({});
  const rightOfferHandle = harden({});
  const cantTradeRightOfferHandle = harden({});
  const reallocatedHandles = [];
  const reallocatedAmountObjs = [];
  const completedHandles = [];
  try {
    const mockZCFBuilder = makeMockZoeBuilder();
    mockZCFBuilder.addBrand(moolaR);
    mockZCFBuilder.addBrand(simoleanR);
    mockZCFBuilder.addAllocation(leftOfferHandle, { Asset: moola(10) });
    mockZCFBuilder.addAllocation(rightOfferHandle, { Price: simoleans(6) });
    mockZCFBuilder.addAllocation(cantTradeRightOfferHandle, {
      Price: simoleans(6),
    });
    mockZCFBuilder.addOffer(leftOfferHandle, {
      proposal: {
        give: { Asset: moola(10) },
        want: { Price: simoleans(4) },
        exit: { onDemand: null },
      },
    });
    const mockZCF = mockZCFBuilder.build();
    const { isOfferSafe } = makeZoeHelpers(mockZCF);
    t.ok(
      isOfferSafe(leftOfferHandle, {
        Asset: moola(0),
        Price: simoleans(4),
      }),
      `giving someone exactly what they want is offer safe`,
    );
    t.notOk(
      isOfferSafe(leftOfferHandle, {
        Asset: moola(0),
        Price: simoleans(3),
      }),
      `giving someone less than what they want and not what they gave is not offer safe`,
    );
    t.deepEquals(reallocatedHandles, harden([]), `nothing reallocated`);
    t.deepEquals(reallocatedAmountObjs, harden([]), `no amounts reallocated`);
    t.deepEquals(completedHandles, harden([]), `no offers completed`);
  } catch (e) {
    t.assert(false, e);
  }
});

test('ZoeHelpers satisfies', t => {
  t.plan(6);
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const leftOfferHandle = harden({});
  const rightOfferHandle = harden({});
  const cantTradeRightOfferHandle = harden({});
  const reallocatedHandles = [];
  const reallocatedAmountObjs = [];
  const completedHandles = [];
  try {
    const mockZCFBuilder = makeMockZoeBuilder();
    mockZCFBuilder.addBrand(moolaR);
    mockZCFBuilder.addBrand(simoleanR);
    mockZCFBuilder.addAllocation(leftOfferHandle, { Asset: moola(10) });
    mockZCFBuilder.addAllocation(rightOfferHandle, { Price: simoleans(6) });
    mockZCFBuilder.addAllocation(cantTradeRightOfferHandle, {
      Price: simoleans(6),
    });
    mockZCFBuilder.addOffer(leftOfferHandle, {
      proposal: {
        give: { Asset: moola(10) },
        want: { Price: simoleans(4) },
        exit: { onDemand: null },
      },
    });
    const mockZCF = mockZCFBuilder.build();
    const { satisfies } = makeZoeHelpers(mockZCF);
    t.ok(
      satisfies(leftOfferHandle, {
        Asset: moola(0),
        Price: simoleans(4),
      }),
      `giving someone exactly what they want satisifies wants`,
    );
    t.notOk(
      satisfies(leftOfferHandle, {
        Asset: moola(10),
        Price: simoleans(3),
      }),
      `giving someone less than what they want even with a refund doesn't satisfy wants`,
    );
    t.notOk(
      satisfies(leftOfferHandle, {
        Asset: moola(0),
        Price: simoleans(3),
      }),
      `giving someone less than what they want even with a refund doesn't satisfy wants`,
    );
    t.deepEquals(reallocatedHandles, harden([]), `nothing reallocated`);
    t.deepEquals(reallocatedAmountObjs, harden([]), `no amounts reallocated`);
    t.deepEquals(completedHandles, harden([]), `no offers completed`);
  } catch (e) {
    t.assert(false, e);
  }
});

test('ZoeHelpers trade ok', t => {
  t.plan(4);
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const leftOfferHandle = harden({});
  const rightOfferHandle = harden({});
  try {
    const mockZCFBuilder = makeMockZoeBuilder();
    mockZCFBuilder.addBrand(moolaR);
    mockZCFBuilder.addBrand(simoleanR);
    mockZCFBuilder.addAllocation(leftOfferHandle, { Asset: moola(10) });
    mockZCFBuilder.addAllocation(rightOfferHandle, { Money: simoleans(6) });
    mockZCFBuilder.addOffer(leftOfferHandle, {
      proposal: {
        give: { Asset: moola(10) },
        want: { Bid: simoleans(4) },
        exit: { onDemand: null },
      },
    });
    mockZCFBuilder.addOffer(rightOfferHandle, {
      proposal: {
        give: { Money: simoleans(6) },
        want: { Items: moola(7) },
        exit: { onDemand: null },
      },
    });
    const mockZCF = mockZCFBuilder.build();
    const { trade } = makeZoeHelpers(mockZCF);
    t.doesNotThrow(() =>
      trade(
        {
          offerHandle: leftOfferHandle,
          gains: { Bid: simoleans(4) },
          losses: { Asset: moola(7) },
        },
        {
          offerHandle: rightOfferHandle,
          gains: { Items: moola(7) },
          losses: { Money: simoleans(4) },
        },
      ),
    );
    t.deepEquals(
      mockZCF.getReallocatedHandles(),
      harden([leftOfferHandle, rightOfferHandle]),
      `both handles reallocated`,
    );
    t.deepEquals(
      mockZCF.getReallocatedAmountObjs(),
      [
        { Asset: moola(3), Bid: simoleans(4) },
        { Money: simoleans(2), Items: moola(7) },
      ],
      `amounts reallocated passed to reallocate were as expected`,
    );
    t.deepEquals(
      mockZCF.getCompletedHandles(),
      harden([]),
      `no handles were completed`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

test('ZoeHelpers trade sameHandle', t => {
  t.plan(4);
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const leftOfferHandle = harden({});
  const rightOfferHandle = harden({});
  try {
    const mockZCFBuilder = makeMockZoeBuilder();
    mockZCFBuilder.addBrand(moolaR);
    mockZCFBuilder.addBrand(simoleanR);
    mockZCFBuilder.addAllocation(leftOfferHandle, { Asset: moola(10) });
    mockZCFBuilder.addAllocation(rightOfferHandle, { Money: simoleans(6) });
    mockZCFBuilder.addOffer(leftOfferHandle, {
      proposal: {
        give: { Asset: moola(10) },
        want: { Bid: simoleans(4) },
        exit: { onDemand: null },
      },
    });
    mockZCFBuilder.addOffer(rightOfferHandle, {
      proposal: {
        give: { Money: simoleans(6) },
        want: { Items: moola(7) },
        exit: { onDemand: null },
      },
    });
    const mockZCF = mockZCFBuilder.build();
    const { trade } = makeZoeHelpers(mockZCF);
    t.throws(
      () =>
        trade(
          {
            offerHandle: leftOfferHandle,
            gains: { Bid: simoleans(4) },
            losses: { Asset: moola(7) },
          },
          {
            offerHandle: leftOfferHandle,
            gains: { Items: moola(7) },
            losses: { Money: simoleans(4) },
          },
        ),
      /an offer cannot trade with itself/,
      `safe offer trading with itself fails with nice error message`,
    );
    t.deepEquals(
      mockZCF.getReallocatedHandles(),
      harden([]),
      `no handles reallocated`,
    );
    t.deepEquals(
      mockZCF.getReallocatedAmountObjs(),
      [],
      `no amounts reallocated`,
    );
    t.deepEquals(
      mockZCF.getCompletedHandles(),
      harden([]),
      `no handles were completed`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});
