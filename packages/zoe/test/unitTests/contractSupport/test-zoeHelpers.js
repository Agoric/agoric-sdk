// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

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

test('ZoeHelpers assertKeywords', t => {
  t.plan(5);
  const { moolaR, simoleanR } = setup();
  try {
    const mockZCF = harden({
      getInstanceRecord: () =>
        harden({
          issuerKeywordRecord: {
            Asset: moolaR.issuer,
            Price: simoleanR.issuer,
          },
        }),
      getAmountMaths: () => {},
      getZoeService: () => {},
    });
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
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const completedOfferHandles = [];
  const offerHandles = harden([{}, {}, {}, {}, {}, {}, {}]);
  try {
    const mockZCF = harden({
      getInstanceRecord: () =>
        harden({
          issuerKeywordRecord: {
            Asset: moolaR.issuer,
            Price: simoleanR.issuer,
          },
        }),
      getAmountMaths: () => {},
      getZoeService: () => {},
      getOffer: handle => {
        if (offerHandles.indexOf(handle) === 4) {
          return harden({
            proposal: {
              want: { Asset: moola(4) },
              give: { Price: simoleans(16) },
              exit: { Waived: null },
            },
          });
        }
        if (offerHandles.indexOf(handle) === 5) {
          return harden({
            proposal: {
              want: { Asset2: moola(4) },
              give: { Price: simoleans(16) },
              exit: { waived: null },
            },
          });
        }
        return harden({
          proposal: {
            want: { Asset: moola(4) },
            give: { Price: simoleans(16) },
            exit: { onDemand: null },
          },
        });
      },
      complete: handles => completedOfferHandles.push(...handles),
    });
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
      completedOfferHandles,
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
      completedOfferHandles,
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
  const { moolaR, simoleanR, moola, simoleans } = setup();
  try {
    const mockZCF = harden({
      getInstanceRecord: () =>
        harden({
          issuerKeywordRecord: {
            Asset: moolaR.issuer,
            Price: simoleanR.issuer,
          },
        }),
      getAmountMaths: () => {},
      getZoeService: () => {},
      getOffer: _handle => {
        return harden({
          proposal: {
            want: { Asset: moola(4) },
            give: { Price: simoleans(16) },
            exit: { onDemand: null },
          },
        });
      },
    });
    const { checkIfProposal } = makeZoeHelpers(mockZCF);
    t.ok(
      checkIfProposal(
        harden({}),
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
        harden({}),
        harden({
          want: { Asset2: null },
          give: { Price: null },
        }),
      ),
      `want was not as expected`,
    );
    t.ok(
      checkIfProposal(harden({}), harden({})),
      `having no expectations passes trivially`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

test('ZoeHelpers checkIfProposal multiple keys', t => {
  t.plan(2);
  const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
  const mockZCF = harden({
    getInstanceRecord: () =>
      harden({
        issuerKeywordRecord: {
          Asset: moolaR.issuer,
          Fee: bucksR.issuer,
          Price: simoleanR.issuer,
        },
      }),
    getAmountMaths: () => {},
    getZoeService: () => {},
    getOffer: _handle => {
      return harden({
        proposal: {
          want: { Asset: moola(4), Fee: bucks(1) },
          give: { Price: simoleans(16) },
          exit: { onDemand: null },
        },
      });
    },
  });
  const { checkIfProposal } = makeZoeHelpers(mockZCF);
  t.ok(
    checkIfProposal(
      harden({}),
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
      harden({}),
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
  const { moolaR, simoleanR } = setup();
  try {
    const mockZCF = harden({
      getInstanceRecord: () =>
        harden({
          issuerKeywordRecord: {
            Asset: moolaR.issuer,
            Price: simoleanR.issuer,
          },
        }),
      getAmountMaths: () => {},
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
  const { moolaR, simoleanR } = setup();
  const completedOfferHandles = [];
  try {
    const mockZCF = harden({
      getInstanceRecord: () =>
        harden({
          issuerKeywordRecord: {
            Asset: moolaR.issuer,
            Price: simoleanR.issuer,
          },
        }),
      getAmountMaths: () => {},
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

test('ZoeHelpers canTradeWith', t => {
  t.plan(2);
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const leftOfferHandle = harden({});
  const rightOfferHandle = harden({});
  const cantTradeRightOfferHandle = harden({});
  try {
    const mockZCF = harden({
      getInstanceRecord: () =>
        harden({
          issuerKeywordRecord: {
            Asset: moolaR.issuer,
            Price: simoleanR.issuer,
          },
          keywords: ['Asset', 'Price'],
        }),
      getAmountMaths: () =>
        harden({ Asset: moolaR.amountMath, Price: simoleanR.amountMath }),
      getZoeService: () => {},
      getOffer: handle => {
        if (handle === leftOfferHandle) {
          return harden({
            proposal: {
              give: { Asset: moola(10) },
              want: { Price: simoleans(4) },
              exit: { onDemand: null },
            },
          });
        }
        if (handle === rightOfferHandle) {
          return harden({
            proposal: {
              give: { Price: simoleans(6) },
              want: { Asset: moola(7) },
              exit: { onDemand: null },
            },
          });
        }
        if (handle === cantTradeRightOfferHandle) {
          return harden({
            proposal: {
              give: { Price: simoleans(6) },
              want: { Asset: moola(100) },
              exit: { onDemand: null },
            },
          });
        }
        throw new Error('unexpected handle');
      },
    });
    const { canTradeWith } = makeZoeHelpers(mockZCF);
    t.ok(canTradeWith(leftOfferHandle, rightOfferHandle));
    t.notOk(canTradeWith(leftOfferHandle, cantTradeRightOfferHandle));
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
  const reallocatedHandles = [];
  const reallocatedAmountObjs = [];
  const completedHandles = [];
  try {
    const mockZCF = harden({
      getInstanceRecord: () =>
        harden({
          issuerKeywordRecord: {
            Asset: moolaR.issuer,
            Price: simoleanR.issuer,
          },
          keywords: ['Asset', 'Price'],
        }),
      getAmountMaths: () =>
        harden({ Asset: moolaR.amountMath, Price: simoleanR.amountMath }),
      getZoeService: () => {},
      isOfferActive: () => true,
      getCurrentAllocation: handle => {
        if (handle === leftOfferHandle) {
          return 'leftInviteAmounts';
        }
        if (handle === rightOfferHandle) {
          return 'rightInviteAmounts';
        }
        if (handle === cantTradeRightOfferHandle) {
          return 'cantTradeRightInviteAmounts';
        }
        throw new Error('unexpected handle');
      },
      getOffer: handle => {
        if (handle === leftOfferHandle) {
          return harden({
            proposal: {
              give: { Asset: moola(10) },
              want: { Price: simoleans(4) },
              exit: { onDemand: null },
            },
          });
        }
        if (handle === rightOfferHandle) {
          return harden({
            proposal: {
              give: { Price: simoleans(6) },
              want: { Asset: moola(7) },
              exit: { onDemand: null },
            },
          });
        }
        if (handle === cantTradeRightOfferHandle) {
          return harden({
            proposal: {
              give: { Price: simoleans(6) },
              want: { Asset: moola(100) },
              exit: { onDemand: null },
            },
          });
        }
        throw new Error('unexpected handle');
      },
      reallocate: (handles, amountObjs) => {
        reallocatedHandles.push(...handles);
        reallocatedAmountObjs.push(...amountObjs);
      },
      complete: handles => completedHandles.push(...handles),
    });
    const { swap } = makeZoeHelpers(mockZCF);
    t.ok(
      swap(
        leftOfferHandle,
        rightOfferHandle,
        'prior offer no longer available',
      ),
    );
    t.deepEquals(
      reallocatedHandles,
      harden([leftOfferHandle, rightOfferHandle]),
      `both handles reallocated`,
    );
    t.deepEquals(
      reallocatedAmountObjs,
      harden(['rightInviteAmounts', 'leftInviteAmounts']),
      `amounts reallocated passed to reallocate were as expected`,
    );
    t.deepEquals(
      completedHandles,
      harden([leftOfferHandle, rightOfferHandle]),
      `both handles were completed`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

test('ZoeHelpers swap keep inactive', t => {
  t.plan(4);
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const leftOfferHandle = harden({});
  const rightOfferHandle = harden({});
  const cantTradeRightOfferHandle = harden({});
  const reallocatedHandles = [];
  const reallocatedAmountObjs = [];
  const completedHandles = [];
  try {
    const mockZCF = harden({
      getInstanceRecord: () =>
        harden({
          issuerKeywordRecord: {
            Asset: moolaR.issuer,
            Price: simoleanR.issuer,
          },
          keywords: ['Asset', 'Price'],
        }),
      getAmountMaths: () =>
        harden({ Asset: moolaR.amountMath, Price: simoleanR.amountMath }),
      getZoeService: () => {},
      isOfferActive: () => false,
      getOffer: handle => {
        if (handle === leftOfferHandle) {
          return harden({
            proposal: {
              give: { Asset: moola(10) },
              want: { Price: simoleans(4) },
              exit: { onDemand: null },
            },
            amounts: 'leftInviteAmounts',
          });
        }
        if (handle === rightOfferHandle) {
          return harden({
            proposal: {
              give: { Price: simoleans(6) },
              want: { Asset: moola(7) },
              exit: { onDemand: null },
            },
            amounts: 'rightInviteAmounts',
          });
        }
        if (handle === cantTradeRightOfferHandle) {
          return harden({
            proposal: {
              give: { Price: simoleans(6) },
              want: { Asset: moola(100) },
              exit: { onDemand: null },
            },
            amounts: 'cantTradeRightInviteAmounts',
          });
        }
        throw new Error('unexpected handle');
      },
      reallocate: (handles, amountObjs) => {
        reallocatedHandles.push(...handles);
        reallocatedAmountObjs.push(...amountObjs);
      },
      complete: handles => handles.map(handle => completedHandles.push(handle)),
    });
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
    t.deepEquals(reallocatedHandles, harden([]), `nothing reallocated`);
    t.deepEquals(reallocatedAmountObjs, harden([]), `no amounts reallocated`);
    t.deepEquals(
      completedHandles,
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
  const cantTradeRightOfferHandle = harden({});
  const reallocatedHandles = [];
  const reallocatedAmountObjs = [];
  const completedHandles = [];
  try {
    const mockZCF = harden({
      getInstanceRecord: () =>
        harden({
          issuerKeywordRecord: {
            Asset: moolaR.issuer,
            Price: simoleanR.issuer,
          },
          keywords: ['Asset', 'Price'],
        }),
      getAmountMaths: () =>
        harden({ Asset: moolaR.amountMath, Price: simoleanR.amountMath }),
      getZoeService: () => {},
      isOfferActive: () => true,
      getOffer: handle => {
        if (handle === leftOfferHandle) {
          return harden({
            proposal: {
              give: { Asset: moola(10) },
              want: { Price: simoleans(4) },
              exit: { onDemand: null },
            },
            amounts: 'leftInviteAmounts',
          });
        }
        if (handle === rightOfferHandle) {
          return harden({
            proposal: {
              give: { Price: simoleans(6) },
              want: { Asset: moola(7) },
              exit: { onDemand: null },
            },
            amounts: 'rightInviteAmounts',
          });
        }
        if (handle === cantTradeRightOfferHandle) {
          return harden({
            proposal: {
              give: { Price: simoleans(6) },
              want: { Asset: moola(100) },
              exit: { onDemand: null },
            },
            amounts: 'cantTradeRightInviteAmounts',
          });
        }
        throw new Error('unexpected handle');
      },
      reallocate: (handles, amountObjs) => {
        reallocatedHandles.push(...handles);
        reallocatedAmountObjs.push(...amountObjs);
      },
      complete: handles => handles.map(handle => completedHandles.push(handle)),
    });
    const { swap } = makeZoeHelpers(mockZCF);
    t.throws(
      () =>
        swap(
          leftOfferHandle,
          cantTradeRightOfferHandle,
          'prior offer no longer available',
        ),
      /Error: The offer was invalid. Please check your refund./,
      `throws if can't trade with left and right`,
    );
    t.deepEquals(reallocatedHandles, harden([]), `nothing reallocated`);
    t.deepEquals(reallocatedAmountObjs, harden([]), `no amounts reallocated`);
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
      getAmountMaths: () => {},
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
