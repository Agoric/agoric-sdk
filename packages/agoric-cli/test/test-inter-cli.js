// @ts-check
/* global Buffer */
import '@endo/init';
import test from 'ava';
import { createCommand, CommanderError } from 'commander';

import { Far } from '@endo/far';
import { boardSlottingMarshaller } from '../src/lib/rpc.js';

import { fmtBid, makeInterCommand } from '../src/commands/inter.js';

const { entries } = Object;

const unused = (...args) => {
  console.error('unused?', ...args);
  assert.fail('should not be needed');
};

/** @typedef {import('@agoric/vats/tools/board-utils.js').BoardRemote} BoardRemote */

/**
 * @param {{ boardId: string, iface: string }} detail
 * @returns {BoardRemote}
 */
const makeBoardRemote = ({ boardId, iface }) =>
  Far(iface, { getBoardId: () => boardId });

/** @type {Record<string, (Brand<'nat'> & BoardRemote)>} */
// @ts-expect-error mock
const topBrands = harden({
  ATOM: makeBoardRemote({ boardId: 'board00848', iface: 'Brand' }),
  IST: makeBoardRemote({ boardId: 'board0566', iface: 'Brand' }),
});

const agoricNames = harden({
  brand: { IST: topBrands.IST, ATOM: topBrands.ATOM, IbcATOM: topBrands.ATOM },

  instance: {
    auctioneer: makeBoardRemote({ boardId: 'board434', iface: 'Instance' }),
  },

  /** @type {Record<string,import('agoric/src/lib/format.js').AssetDescriptor>} */
  vbankAsset: {
    uist: {
      denom: 'uist',
      brand: topBrands.IST,
      displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
      issuer: /** @type {any} */ ({}),
      issuerName: 'IST',
      proposedName: 'Agoric stable token',
    },

    'ibc/toyatom': {
      denom: 'ibc/toyatom',
      brand: topBrands.ATOM,
      displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
      issuer: /** @type {any} */ ({}),
      issuerName: 'ATOM',
      proposedName: 'ATOM',
    },
  },
});

const bslot = {
  ATOM: { '@qclass': 'slot', index: 0 },
  IST: { '@qclass': 'slot', index: 1 },
};
const qi = i => ({ '@qclass': 'bigint', digits: `${i}` });
const mk = (brand, v) => ({ brand, value: qi(v) });

const offerSpec1 = harden({
  method: 'executeOffer',
  offer: {
    id: 'bid-978307200000',
    invitationSpec: {
      callPipe: [['makeBidInvitation', [bslot.ATOM]]],
      instancePath: ['auctioneer'],
      source: 'agoricContract',
    },
    offerArgs: {
      offerPrice: {
        numerator: mk(bslot.IST, 9n),
        denominator: mk(bslot.ATOM, 1n),
      },
      want: mk(bslot.ATOM, 5000000n),
    },
    proposal: {
      exit: { onDemand: null },
      give: {
        Currency: mk(bslot.IST, 50000000n),
      },
    },
  },
});

const publishedNames = {
  agoricNames: {
    brand: entries(agoricNames.brand),
    instance: entries(agoricNames.instance),
    vbankAsset: entries(agoricNames.vbankAsset),
  },
};

const makeNet = published => {
  const encode = txt => {
    const value = Buffer.from(txt).toString('base64');
    return { result: { response: { code: 0, value } } };
  };
  const m = boardSlottingMarshaller();
  const fmt = obj => {
    const capData = m.serialize(obj);
    const values = [JSON.stringify(capData)];
    const specimen = { blockHeight: undefined, values };
    const txt = JSON.stringify({
      value: JSON.stringify(specimen),
    });
    return encode(txt);
  };

  /** @type {typeof fetch} */
  // @ts-expect-error mock
  const fetch = async (url, _opts) => {
    const matched = url.match(
      /abci_query\?path=%22\/custom\/vstorage\/data\/published.(?<path>[^%]+)%22/,
    );
    if (!matched) throw Error(`fetch what?? ${url}`);
    const { path } = matched.groups;
    let data = published;
    for (const key of path.split('.')) {
      data = data[key];
      if (!data) throw Error(`query what?? ${path}`);
    }
    return harden({
      json: async () => fmt(data),
    });
  };

  return { fetch };
};

const govKeyring = {
  gov1: 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
  gov2: 'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
};

const makeProcess = (t, keyring, out) => {
  /** @type {typeof import('child_process').execFileSync} */
  // @ts-expect-error mock
  const execFileSync = (file, args) => {
    switch (file) {
      case 'agd': {
        t.deepEqual(args.slice(0, 3), ['keys', 'show', '--address']);
        const name = args[3];
        const addr = keyring[name];
        if (!addr) {
          throw Error(`no such key in keyring: ${name}`);
        }
        return addr;
      }
      default:
        throw Error('not impl');
    }
  };

  const stdout = harden({
    write: x => {
      out.push(x);
      return true;
    },
  });
  return {
    env: {},
    stdout,
    stderr: { write: _s => true },
    now: () => Date.parse('2001-01-01'),
    createCommand,
    execFileSync,
  };
};

test('inter bid place by-price: output is correct', async t => {
  const argv =
    'node inter bid by-price --giveCurrency 50 --price 9 --wantCollateral 5'
      .trim()
      .split(' ');

  const out = [];
  const cmd = await makeInterCommand(
    { ...makeProcess(t, govKeyring, out), execFileSync: unused },
    makeNet(publishedNames),
  );
  cmd.exitOverride(() => t.fail('exited'));

  await cmd.parseAsync(argv);

  const x = out.join('').trim();
  const { body, slots } = JSON.parse(x);
  const o = JSON.parse(body);

  t.deepEqual(o, offerSpec1);
  t.deepEqual(
    slots,
    [topBrands.ATOM, topBrands.IST].map(b => b.getBoardId()),
  );
});

/**
 * @type {import('@agoric/smart-wallet/src/offers.js').OfferStatus &
 *         { offerArgs: import('@agoric/inter-protocol/src/auction/auctionBook.js').BidSpec}}
 */
const offerStatus1 = harden({
  error: 'Error: "nameKey" not found: (a string)',
  id: 1678990150266,
  invitationSpec: {
    callPipe: [['makeBidInvitation', [topBrands.ATOM]]],
    instancePath: ['auctioneer'],
    source: 'agoricContract',
  },
  offerArgs: {
    offerPrice: {
      denominator: { brand: topBrands.ATOM, value: 2000000n },
      numerator: { brand: topBrands.IST, value: 20000000n },
    },
    want: { brand: topBrands.ATOM, value: 2000000n },
  },
  proposal: {
    give: {
      Currency: { brand: topBrands.ATOM, value: 20000000n },
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
    callPipe: [['makeBidInvitation', [topBrands.ATOM]]],
    instancePath: ['auctioneer'],
    source: 'agoricContract',
  },
  offerArgs: {
    offerBidScaling: {
      denominator: { brand: topBrands.IST, value: 100n },
      numerator: { brand: topBrands.IST, value: 90n },
    },
    want: { brand: topBrands.ATOM, value: 2000000n },
  },
  proposal: {
    give: {
      Currency: { brand: topBrands.ATOM, value: 20000000n },
    },
  },
  payouts: {
    Collateral: { brand: topBrands.ATOM, value: 5_000_000n },
    Currency: { brand: topBrands.IST, value: 37_000_000n },
  },
});

test('inter bid list: finds one bid', async t => {
  const argv = 'node inter bid list --from gov1'.split(' ');

  const wallet = {
    [govKeyring.gov1]: { updated: 'offerStatus', status: offerStatus2 },
    [govKeyring.gov2]: { updated: 'XXX' },
  };

  const out = [];

  const cmd = await makeInterCommand(
    makeProcess(t, govKeyring, out),
    makeNet({ ...publishedNames, wallet }),
  );
  cmd.exitOverride(() => t.fail('exited'));

  await cmd.parseAsync(argv);
  t.deepEqual(
    out.join('').trim(),
    JSON.stringify({
      id: 'bid-234234',
      discount: 10,
      give: { Currency: '20 ATOM' },
      want: '2 ATOM',
      payouts: { Collateral: '5 ATOM', Currency: '37 IST' },
    }),
  );
});

const subCommands = c => [c, ...c.commands.flatMap(subCommands)];

const usageTest = (words, blurb = 'Command usage:') => {
  test(`Usage: ${words}`, async t => {
    const argv = `node agops ${words} --help`.split(' ');

    const out = [];
    const program = createCommand('agops');
    const cmd = await makeInterCommand(makeProcess(t, {}, out), makeNet({}));
    program.addCommand(cmd);
    const cs = subCommands(program);
    cs.forEach(c =>
      c.exitOverride(() => {
        throw new CommanderError(1, 'usage', '');
      }),
    );
    cmd.configureOutput({
      writeOut: s => out.push(s),
      writeErr: s => out.push(s),
    });

    await t.throwsAsync(program.parseAsync(argv), {
      instanceOf: CommanderError,
    });
    t.snapshot(out.join('').trim(), blurb);
  });
};
usageTest('inter');
usageTest('inter liquidation status');
usageTest('inter bid by-price');
usageTest('inter bid by-discount');
usageTest('inter bid list');
usageTest('inter reserve add');

test('formatBid', t => {
  const { values } = Object;
  {
    const actual = fmtBid(offerStatus1, values(agoricNames.vbankAsset));
    t.deepEqual(actual, {
      id: 1678990150266,
      error: 'Error: "nameKey" not found: (a string)',
      give: { Currency: '20 ATOM' },
      price: '10 IST/ATOM',
      want: '2 ATOM',
    });
  }
  {
    const actual = fmtBid(offerStatus2, values(agoricNames.vbankAsset));
    t.deepEqual(actual, {
      id: 'bid-234234',
      give: { Currency: '20 ATOM' },
      payouts: { Collateral: '5 ATOM', Currency: '37 IST' },
      want: '2 ATOM',
      discount: 10,
    });
  }
});
