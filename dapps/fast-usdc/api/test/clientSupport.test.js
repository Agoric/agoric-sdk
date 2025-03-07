import test from 'ava';

// XXX makeIssuerKit requires VatData
import '@agoric/swingset-liveslots/tools/prepare-test-env.js';

import { makeIssuerKit } from '@agoric/ertp';
import { Offers } from '../src/clientSupport.js';

const usdc = makeIssuerKit('USDC');
const fastLP = makeIssuerKit('FastLP');

/** @type {import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes} */
const agoricNames = {
  brand: {
    // @ts-expect-error not a real BoardRemote
    FastLP: fastLP.brand,
    // @ts-expect-error not a real BoardRemote
    USDC: usdc.brand,
  },
  // Other required AgoricNames properties...
};

test('makeDepositOffer', t => {
  const offer = Offers.fastUsdc.Deposit(agoricNames, {
    offerId: 'deposit1',
    fastLPAmount: BigInt(3 * 10 ** 6),
    usdcAmount: BigInt(100 * 10 ** 6),
  });

  t.deepEqual(offer, {
    id: 'deposit1',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['fastUsdc'],
      callPipe: [['makeDepositInvitation']],
    },
    proposal: {
      give: {
        USDC: {
          brand: agoricNames.brand.USDC,
          value: 100_000_000n,
        },
      },
      want: {
        PoolShare: {
          brand: agoricNames.brand.FastLP,
          value: 3_000_000n,
        },
      },
    },
  });
});

test('makeWithdrawOffer', t => {
  const offer = Offers.fastUsdc.Withdraw(agoricNames, {
    offerId: 'withdraw1',
    fastLPAmount: BigInt(5 * 10 ** 6),
    usdcAmount: BigInt(50 * 10 ** 6),
  });

  t.deepEqual(offer, {
    id: 'withdraw1',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['fastUsdc'],
      callPipe: [['makeWithdrawInvitation']],
    },
    proposal: {
      give: {
        PoolShare: {
          brand: agoricNames.brand.FastLP,
          value: 5_000_000n,
        },
      },
      want: {
        USDC: {
          brand: agoricNames.brand.USDC,
          value: 50_000_000n,
        },
      },
    },
  });
});
