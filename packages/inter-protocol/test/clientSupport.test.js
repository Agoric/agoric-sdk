import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { Offers } from '../src/clientSupport.js';
import { withAmountUtils } from './supports.js';

const ist = withAmountUtils(makeIssuerKit('IST'));
const atom = withAmountUtils(makeIssuerKit('ATOM'));
const stAtom = withAmountUtils(makeIssuerKit('stATOM'));

// uses actual Brand objects instead of BoardRemote to make the test output more legible
/**
 * @satisfies {Partial<
 *   import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes
 * >}
 */
const agoricNames = {
  brand: {
    IST: /** @type {any} */ (ist.brand),
    ATOM: /** @type {any} */ (atom.brand),
    stATOM: /** @type {any} */ (stAtom.brand),
  },
  vbankAsset: {
    uist: {
      denom: 'uist',
      brand: /** @type {any} */ (ist.brand),
      displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
      issuer: /** @type {any} */ ({}),
      issuerName: 'IST',
      proposedName: 'Agoric stable token',
    },
    'ibc/toyatom': {
      denom: 'ibc/toyatom',
      brand: /** @type {any} */ (atom.brand),
      displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
      issuer: /** @type {any} */ ({}),
      issuerName: 'ATOM',
      proposedName: 'ATOM',
    },
    'ibc/sttoyatom': {
      denom: 'ibc/sttoyatom',
      brand: /** @type {any} */ (stAtom.brand),
      displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
      issuer: /** @type {any} */ ({}),
      issuerName: 'stATOM',
      proposedName: 'stATOM',
    },
  },
};

test('Offers.auction.Bid', async t => {
  const discounts = [
    { cliArg: 0.05, offerBidScaling: makeRatio(95n, ist.brand, 100n) },
    { cliArg: 0.95, offerBidScaling: makeRatio(5n, ist.brand, 100n) },
    { cliArg: -0.05, offerBidScaling: makeRatio(105n, ist.brand, 100n) },
    { cliArg: -0.1, offerBidScaling: makeRatio(110n, ist.brand, 100n) },
  ];

  for (const { cliArg, offerBidScaling } of discounts) {
    t.log('discount', cliArg * 100, '%');
    t.deepEqual(
      Offers.auction.Bid(agoricNames, {
        offerId: 'foo1',
        give: '4.56IST',
        discount: cliArg,
        maxBuy: '10_000ATOM',
      }),
      {
        id: 'foo1',
        invitationSpec: {
          source: 'agoricContract',
          instancePath: ['auctioneer'],
          callPipe: [['makeBidInvitation', [atom.brand]]],
        },
        proposal: {
          give: { Bid: ist.make(4_560_000n) },
        },
        offerArgs: {
          offerBidScaling,
          maxBuy: { brand: atom.brand, value: 10_000_000_000n },
        },
      },
    );
  }

  const price = 7;
  const offerPrice = makeRatio(7n, ist.brand, 1n, atom.brand);
  t.deepEqual(
    Offers.auction.Bid(agoricNames, {
      offerId: 'by-price2',
      give: '4.56IST',
      price,
      maxBuy: '10_000ATOM',
    }),
    {
      id: 'by-price2',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['auctioneer'],
        callPipe: [['makeBidInvitation', [atom.brand]]],
      },
      proposal: { give: { Bid: ist.make(4_560_000n) } },
      offerArgs: {
        offerPrice,
        maxBuy: { brand: atom.brand, value: 10_000_000_000n },
      },
    },
  );

  t.deepEqual(
    Offers.auction.Bid(agoricNames, {
      offerId: 'by-price2',
      maxBuy: '10_000ATOM',
      wantMinimum: '1.23ATOM',
      give: '4.56IST',
      price,
    }),
    {
      id: 'by-price2',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['auctioneer'],
        callPipe: [['makeBidInvitation', [atom.brand]]],
      },
      proposal: {
        give: { Bid: ist.make(4_560_000n) },
        want: { Collateral: atom.make(1_230_000n) },
      },
      offerArgs: {
        offerPrice,
        maxBuy: atom.make(10_000_000_000n),
      },
    },
    'optional want',
  );

  const offerPrice2 = makeRatio(7n, ist.brand, 1n, stAtom.brand);
  t.deepEqual(
    Offers.auction.Bid(agoricNames, {
      offerId: 'by-price3',
      maxBuy: '10_000stATOM',
      wantMinimum: '1.23stATOM',
      give: '4.56IST',
      price,
    }),
    {
      id: 'by-price3',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['auctioneer'],
        callPipe: [['makeBidInvitation', [stAtom.brand]]],
      },
      proposal: {
        give: { Bid: ist.make(4_560_000n) },
        want: { Collateral: stAtom.make(1_230_000n) },
      },
      offerArgs: {
        offerPrice: offerPrice2,
        maxBuy: stAtom.make(10_000_000_000n),
      },
    },
    'lowercase brand',
  );

  t.throws(
    () =>
      // @ts-expect-error error checking test
      Offers.auction.Bid(agoricNames, {
        offerId: 'by-price2',
        wantMinimum: '1.23ATOM',
        give: '4.56IST',
        price,
      }),
    { message: 'missing ["maxBuy"]' },
  );
});
