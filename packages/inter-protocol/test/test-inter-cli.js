// @ts-check
import '@endo/init';
/* eslint-disable-next-line import/no-unresolved */
import test from 'ava';
import { createCommand as ambientCreateCommand } from 'commander';
import { fmtBid, makeInterCommand } from '../src/commands/inter.js';

const brand = {
  /** @type {Brand<'nat'> & import('@agoric/vats/tools/board-utils.js').BoardRemote} */
  // @ts-expect-error XXX BoardRemote
  ATOM: { getBoardId: () => 'board00848' },
  /** @type {Brand<'nat'> & import('@agoric/vats/tools/board-utils.js').BoardRemote} */
  // @ts-expect-error XXX BoardRemote
  IST: { getBoardId: () => 'board0566' },
};

const agoricNames = harden({
  brand,

  /** @type {Record<string,import('agoric/src/lib/format.js').AssetDescriptor>} */
  vbankAsset: {
    uist: {
      brand: brand.IST,
      denom: 'uist',
      displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
      issuer: /** @type {any} */ ({}),
      issuerName: 'IST',
      proposedName: 'Agoric stable local currency',
    },

    'ibc/toyatom': {
      brand: brand.ATOM,
      denom: 'ibc/toyatom',
      displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
      issuer: /** @type {any} */ ({}),
      issuerName: 'ATOM',
      proposedName: 'ATOM',
    },
  },
});

/**
 * @type {import('@agoric/smart-wallet/src/offers.js').OfferStatus &
 *         { offerArgs: import('@agoric/inter-protocol/src/auction/auctionBook.js').BidSpec}}
 */
const offerStatus1 = harden({
  error: 'Error: "nameKey" not found: (a string)',
  id: 1678990150266,
  invitationSpec: {
    callPipe: [['getBidInvitation', [brand.ATOM]]],
    instancePath: ['auctioneer'],
    source: 'agoricContract',
  },
  offerArgs: {
    offerPrice: {
      denominator: { brand: brand.ATOM, value: 2000000n },
      numerator: { brand: brand.IST, value: 20000000n },
    },
    want: { brand: brand.ATOM, value: 2000000n },
  },
  proposal: {
    give: {
      Currency: { brand: brand.ATOM, value: 20000000n },
    },
  },
});

/**
 * @type {import('@agoric/smart-wallet/src/offers.js').OfferStatus &
 *         { offerArgs: import('@agoric/inter-protocol/src/auction/auctionBook.js').BidSpec}}
 */
const offerStatus2 = harden({
  id: 'bid-234234',
  invitationSpec: {
    callPipe: [['getBidInvitation', [brand.ATOM]]],
    instancePath: ['auctioneer'],
    source: 'agoricContract',
  },
  offerArgs: {
    offerBidScaling: {
      denominator: { brand: brand.IST, value: 100n },
      numerator: { brand: brand.IST, value: 90n },
    },
    want: { brand: brand.ATOM, value: 2000000n },
  },
  proposal: {
    give: {
      Currency: { brand: brand.ATOM, value: 20000000n },
    },
  },
  payouts: {
    Collateral: { brand: brand.ATOM, value: 5_000_000n },
    Currency: { brand: brand.IST, value: 37_000_000n },
  },
});

test('formatBid', t => {
  const { values } = Object;
  {
    const actual = fmtBid(offerStatus1, values(agoricNames.vbankAsset));
    t.deepEqual(actual, {
      id: 1678990150266,
      error: 'Error: "nameKey" not found: (a string)',
      give: { Currency: '20ATOM' },
      price: '10 IST/ATOM',
      want: '2ATOM',
    });
  }
  {
    const actual = fmtBid(offerStatus2, values(agoricNames.vbankAsset));
    t.deepEqual(actual, {
      id: 'bid-234234',
      give: { Currency: '20ATOM' },
      payouts: { Collateral: '5ATOM', Currency: '37IST' },
      want: '2ATOM',
      discount: 10,
    });
  }
});

test.before(t => {
  t.context = {
    createCommand: ambientCreateCommand,
  };
});

// TODO: figure out how to interpose network access for cosmjs, casting
test.skip('inter bid list', async t => {
  // @ts-expect-error XXX typed t.context
  const { createCommand, setFetchImpl } = t.context;
  const out = [];
  const stdout = harden({
    write: x => (out.push(x), true),
  });
  const clock = () => 1000;
  const fetch = (...args) => {
    console.log('@@featch', ...args);
    throw Error('fetch failed');
  };

  // cosmjs grabs ambient fetch
  setFetchImpl({ fetch });

  /** @type {typeof import('child_process').execFileSync} */
  // @ts-expect-error mock
  const execFileSync = (file, args) => {
    switch (file) {
      case 'agd':
        t.deepEqual(args.slice(0, 3), ['keys', 'show', '--address']);
        return `agoric1${args[3]}`;
      default:
        throw Error('not impl');
    }
  };
  const cmd = await makeInterCommand(
    { env: {}, stdout, clock, createCommand, execFileSync },
    { fetch },
  );

  await cmd.parseAsync(['node', 'inter', 'bid', 'list', '--from', 'gov1']);
});
