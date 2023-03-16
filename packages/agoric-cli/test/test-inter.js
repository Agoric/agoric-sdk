import '@endo/init';
import test from 'ava';
import { fmtBid } from '../src/inter.js';

const brand = {
  IbcATOM: { getBoardId: () => 'board00848' },
  IST: { getBoardId: () => 'board0566' },
};

const agoricNames = {
  brand,

  vbankAsset: {
    uist: {
      brand: brand.IST,
      denom: 'uist',
      displayInfo: {
        assetKind: 'nat',
        decimalPlaces: 6,
      },
      issuer: {},
      issuerName: 'IST',
      proposedName: 'Agoric stable local currency',
    },

    'ibc/toyatom': {
      brand: brand.IbcATOM,
      denom: 'ibc/toyatom',
      displayInfo: {
        assetKind: 'nat',
        decimalPlaces: 6,
      },
      issuer: {},
      issuerName: 'IbcATOM',
      proposedName: 'ATOM',
    },
  },
};

const offerStatus1 = {
  error: 'Error: "nameKey" not found: (a string)',
  id: 1678990150266,
  invitationSpec: {
    callPipe: [['getBidInvitation', [brand.IbcATOM]]],
    instancePath: ['auctioneer'],
    source: 'agoricContract',
  },
  offerArgs: {
    offerPrice: {
      denominator: { brand: brand.IbcATOM, value: 2000000n },
      numerator: { brand: brand.IST, value: 20000000n },
    },
    want: {
      Collateral: { brand: brand.IbcATOM, value: 2000000n },
    },
  },
  proposal: {
    give: {
      Currency: { brand: brand.IbcATOM, value: 20000000n },
    },
  },
};

test('formatBid', t => {
  const { values } = Object;
  const actual = fmtBid(offerStatus1, values(agoricNames.vbankAsset));
  t.deepEqual(actual, {
    id: 1678990150266,
    error: 'Error: "nameKey" not found: (a string)',
    give: {
      Currency: '20IbcATOM',
    },
    payouts: undefined,
    price: '20IST/2IbcATOM}',
    want: {
      Collateral: '2IbcATOM',
    },
  });
});
