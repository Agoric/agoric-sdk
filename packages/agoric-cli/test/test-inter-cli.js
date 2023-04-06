// @ts-check
/* global Buffer */
import '@endo/init';
import test from 'ava';
import { createCommand, CommanderError } from 'commander';

import { Far } from '@endo/far';
import { boardSlottingMarshaller } from '../src/lib/rpc.js';

import { fmtBid, makeInterCommand, KW } from '../src/commands/inter.js';
import { makeParseAmount } from '../src/lib/wallet.js';

const { entries } = Object;

/** @typedef {import('commander').Command} Command */
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
      want: mk(bslot.ATOM, 1_000_000_000_000n),
    },
    proposal: {
      give: { [KW.Bid]: mk(bslot.IST, 50_000_000n) },
    },
  },
});

const publishedNames = {
  agoricNames: {
    brand: { _: entries(agoricNames.brand) },
    instance: { _: entries(agoricNames.instance) },
    vbankAsset: { _: entries(agoricNames.vbankAsset) },
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
    let node = published;
    for (const key of path.split('.')) {
      node = node[key];
      if (!node) throw Error(`query what?? ${path}`);
    }
    if (!node._) throw Error(`no data at ${path}`);
    return harden({
      json: async () => fmt(node._),
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
        // first arg that doesn't sart with --
        const cmd = args.find(a => !a.startsWith('--'));
        t.truthy(cmd);
        switch (cmd) {
          case 'keys': {
            ['--node', '--chain'].forEach(opt => {
              const ix = args.findIndex(a => a.startsWith(opt));
              if (ix >= 0) {
                args.splice(ix, 1);
              }
            });
            t.deepEqual(args.slice(0, 3), ['keys', 'show', '--address']);
            const name = args[3];
            const addr = keyring[name];
            if (!addr) {
              throw Error(`no such key in keyring: ${name}`);
            }
            return addr;
          }
          case 'status': {
            return JSON.stringify({
              SyncInfo: { latest_block_time: 123, latest_block_height: 456 },
            });
          }
          case 'query': {
            return JSON.stringify({});
          }
          case 'tx': {
            return JSON.stringify({ code: 0 });
          }
          default:
            t.fail(`agd cmd not impl:${args[0]}`);
        }
        break;
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

  /** @type {typeof setTimeout} */
  // @ts-expect-error mock
  const setTimeout = (f, _ms) => Promise.resolve().then(_ => f());

  return {
    env: {},
    stdout,
    stderr: { write: _s => true },
    now: () => Date.parse('2001-01-01'),
    setTimeout,
    createCommand,
    execFileSync,
  };
};

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
      [KW.Bid]: { brand: topBrands.ATOM, value: 20000000n },
    },
  },
  payouts: {
    Collateral: { brand: topBrands.ATOM, value: 5_000_000n },
    [KW.Bid]: { brand: topBrands.IST, value: 37_000_000n },
  },
});

const govWallets = {
  [govKeyring.gov1]: {
    _: { updated: 'offerStatus', status: offerStatus2 },
    current: { _: { liveOffers: [[offerStatus2.id, offerStatus2]] } },
  },
  [govKeyring.gov2]: { current: {} },
};

test('amount parsing', t => {
  const parseAmount = makeParseAmount(agoricNames);
  const b = topBrands;

  t.deepEqual(parseAmount('1ATOM'), { brand: b.ATOM, value: 1_000_000n });
  t.deepEqual(
    parseAmount('10_000ATOM'),
    {
      brand: b.ATOM,
      value: 10_000_000_000n,
    },
    'handle underscores',
  );
  t.deepEqual(
    parseAmount('1.5ATOM'),
    { brand: b.ATOM, value: 1_500_000n },
    'handle decimal',
  );

  t.throws(() => parseAmount('5'), { message: 'invalid amount: 5' });
  t.throws(() => parseAmount('50'), { message: 'invalid amount: 50' });
  t.throws(() => parseAmount('5.5.5ATOM'), {
    message: 'invalid amount: 5.5.5ATOM',
  });
});

test('inter bid place by-price: printed offer is correct', async t => {
  const argv =
    'node inter bid by-price --give 50IST --price 9 --from gov1 --generate-only'
      .trim()
      .split(' ');

  const out = [];
  const cmd = await makeInterCommand(
    { ...makeProcess(t, govKeyring, out) },
    makeNet({ ...publishedNames, wallet: govWallets }),
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

test.todo('want as max collateral wanted');

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
      [KW.Bid]: { brand: topBrands.ATOM, value: 20000000n },
    },
  },
});

test('inter bid list: finds one bid', async t => {
  const argv = 'node inter bid list --from gov1'.split(' ');

  const out = [];

  const cmd = await makeInterCommand(
    makeProcess(t, govKeyring, out),
    makeNet({ ...publishedNames, wallet: govWallets }),
  );
  cmd.exitOverride(() => t.fail('exited'));

  await cmd.parseAsync(argv);
  t.deepEqual(
    out.join('').trim(),
    JSON.stringify({
      id: 'bid-234234',
      discount: 10,
      give: { [KW.Bid]: '20 ATOM' },
      desiredBuy: '2 ATOM',
      payouts: { Collateral: '5 ATOM', [KW.Bid]: '37 IST' },
    }),
  );
});

/** @type {(c: Command) => Command[]} */
const subCommands = c => [c, ...c.commands.flatMap(subCommands)];

test('diagnostic for agd ENOENT', async t => {
  const argv = 'node inter bid list --from gov1'.split(' ');

  const out = [];
  const diag = [];
  const proc = makeProcess(t, govKeyring, out);
  const cmd = await makeInterCommand(
    {
      ...proc,
      execFileSync: file => {
        t.is(file, 'agd');
        throw Error('ENOENT');
      },
    },
    makeNet({}),
  );
  subCommands(cmd).forEach(c => {
    c.exitOverride();
    c.configureOutput({ writeErr: s => diag.push(s) });
  });

  await t.throwsAsync(cmd.parseAsync(argv), { instanceOf: CommanderError });
  t.deepEqual(
    diag.join('').trim(),
    "error: option '--from <address>' argument 'gov1' is invalid. ENOENT: is agd in your $PATH?",
  );
  t.deepEqual(out.join('').trim(), '');
});

test.todo('agd ENOENT clue outside normalizeAddress');

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
usageTest('inter bid cancel');
usageTest('inter vbank list');

test('formatBid', t => {
  const { values } = Object;
  {
    const actual = fmtBid(offerStatus1, values(agoricNames.vbankAsset));
    t.deepEqual(actual, {
      id: 1678990150266,
      error: 'Error: "nameKey" not found: (a string)',
      give: { [KW.Bid]: '20 ATOM' },
      price: '10 IST/ATOM',
      desiredBuy: '2 ATOM',
    });
  }
  {
    const actual = fmtBid(offerStatus2, values(agoricNames.vbankAsset));
    t.deepEqual(actual, {
      id: 'bid-234234',
      give: { [KW.Bid]: '20 ATOM' },
      payouts: { Collateral: '5 ATOM', [KW.Bid]: '37 IST' },
      desiredBuy: '2 ATOM',
      discount: 10,
    });
  }
});

test.todo('fmtBid with error does not show result');
/*
_not_ like this:

{"id":"bid-1680211654832","price":"0.7999999999999999 IST/IbcATOM","give":{"Currency":"10IST"},"want":"3IbcATOM","result":[{"reason":{"@qclass":"error","errorId":"error:anon-marshal#10001","message":"cannot grab 10000000uist coins: 4890000uist is smaller than 10000000uist: insufficient funds [agoric-labs/cosmos-sdk@v0.45.11-alpha.agoric.1.0.20230320225042-2109765fd835/x/bank/keeper/send.go:186]","name":"Error"},"status":"rejected"}],"error":"Error: cannot grab 10000000uist coins: 4890000uist is smaller than 10000000uist: insufficient funds [agoric-labs/cosmos-sdk@v0.45.11-alpha.agoric.1.0.20230320225042-2109765fd835/x/bank/keeper/send.go:186]"}
*/

test.todo('execSwingsetTransaction returns non-0 code');

test.todo('inter bid by-price shows tx, wallet status');
/*
$ agops inter bid by-price --price 0.81 --give 0.5 --want 3 --from gov2
2023-03-30T21:48:14.479332418Z not in block 49618 retrying...
bid is broadcast:
{"timestamp":"2023-03-30T21:48:19Z","height":"49619","offerId":"bid-1680212903989","txhash":"472A47AAE24F27E747E3E64F4644860D2A5D3AD7EC5388C4C849805034E20D38"}
first bid update:
{"id":"bid-1680212903989","price":"0.81 IST/IbcATOM","give":{"Currency":"0.5IST"},"want":"3IbcATOM","result":"Your bid has been accepted"}
*/

test.todo('inter bid cancel shows resulting payouts');
/*

*/

test.todo('already cancelled bid');
/*
$ agops inter bid cancel --from gov2 bid-1680211556497
bid-1680211556497 not in live offer ids: bid-1680211593489,bid-1680212903989,bid-1680213097499,bid-1680220217218,bid-1680220368714,bid-1680220406939
*/

test.todo('--give without number');
