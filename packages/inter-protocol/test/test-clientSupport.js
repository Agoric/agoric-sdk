import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { withAmountUtils } from './supports.js';
import { Offers } from '../src/clientSupport.js';

const ist = withAmountUtils(makeIssuerKit('IST'));
const atom = withAmountUtils(makeIssuerKit('ATOM'));

const brands = {
  IST: ist.brand,
  ATOM: atom.brand,
};

test('Offers.auction.Bid', async t => {
  t.deepEqual(
    Offers.auction.Bid(brands, {
      offerId: 'foo1',
      wantCollateral: 1.23,
      giveCurrency: 4.56,
      collateralBrandKey: 'ATOM',
      discount: -0.1,
    }),
    {
      id: 'foo1',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['auctioneer'],
        callPipe: [['makeBidInvitation', [atom.brand]]],
      },
      proposal: {
        give: { Currency: ist.make(4_560_000n) },
      },
      offerArgs: {
        offerBidScaling: {
          denominator: ist.make(10n),
          numerator: ist.make(11n),
        },
        want: atom.make(1_230_000n),
      },
    },
  );

  t.deepEqual(
    Offers.auction.Bid(brands, {
      offerId: 'by-price2',
      wantCollateral: 1.23,
      giveCurrency: 4.56,
      collateralBrandKey: 'ATOM',
      price: 7,
    }),
    {
      id: 'by-price2',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['auctioneer'],
        callPipe: [['makeBidInvitation', [atom.brand]]],
      },
      proposal: {
        give: { Currency: ist.make(4_560_000n) },
      },
      offerArgs: {
        offerPrice: {
          denominator: atom.make(1n),
          numerator: ist.make(7n),
        },
        want: atom.make(1_230_000n),
      },
    },
  );
});
