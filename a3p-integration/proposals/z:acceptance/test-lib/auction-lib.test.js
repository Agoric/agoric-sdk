import '@endo/init';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/far';
import test from 'ava';
import { checkBidsOutcome, checkDepositOutcome } from './auction-lib.js';
import { GOV3ADDR, USER1ADDR } from '@agoric/synthetic-chain';

// From auction.test.js
const config = {
  depositor: {
    name: 'gov1',
    depositValue: '100000000',
    offerId: `gov1-deposit-${Date.now()}`,
  },
  longLivingBidSetup: {
    name: 'long-living-bidder',
    // This bid is placed in an earlier proposal
    give: '80IST',
  },
  currentBidsSetup: {
    user1: {
      bidder: USER1ADDR,
      bidderFund: {
        value: 90000000,
        denom: 'uist',
      },
      offerId: `user1-bid-${Date.now()}`,
      give: '90IST',
      price: 46,
    },
    gov3: {
      bidder: GOV3ADDR,
      bidderFund: {
        value: 150000000,
        denom: 'uist',
      },
      offerId: `gov3-bid-${Date.now()}`,
      give: '150IST',
      discount: '13',
    },
  },
  bidsOutcome: {
    longLivingBidder: {
      payouts: {
        Bid: 0,
        Collateral: 1.68421,
      },
    },
    user1: {
      payouts: {
        Bid: 0,
        Collateral: 2.0,
      },
    },
    gov3: {
      payouts: {
        Bid: 0,
        Collateral: 3.448275,
      },
    },
  },
};

test.before(t => {
  const mockIST = Far('IST', {});
  const mockATOM = Far('ATOM', {});

  t.context = {
    brands: {
      IST: mockIST,
      ATOM: mockATOM,
    },
  };
});

test('make sure check* functions work properly', async t => {
  // @ts-expect-error
  const { brands } = t.context;
  const result = {
    status: {
      payouts: {
        Bid: AmountMath.make(brands.IST, 0n),
        Collateral: AmountMath.make(brands.ATOM, 1684210n),
      },
    },
  };

  checkBidsOutcome(
    t,
    {
      'longLivingBidder.results': result,
      'user1.results': {
        status: {
          payouts: {
            Bid: AmountMath.make(brands.IST, 0n),
            Collateral: AmountMath.make(brands.ATOM, 2000000n),
          },
        },
      },
      'gov3.results': {
        status: {
          payouts: {
            Bid: AmountMath.make(brands.IST, 0n),
            Collateral: AmountMath.make(brands.ATOM, 3448275n),
          },
        },
      },
    },
    config.bidsOutcome,
    brands,
  );

  checkDepositOutcome(
    t,
    harden({
      Bid: AmountMath.make(brands.IST, 320000000n),
      Collateral: AmountMath.make(brands.ATOM, 100_000_000n - 7_132_485n),
    }),
    config,
    brands,
  );
});
