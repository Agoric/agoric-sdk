// @ts-check

/**
 * @file mainnet-2 contract start test
 *
 * Expects several environment variables:
 * If $MN2_PROPOSAL_INFO is not set, no tests are run.
 *
 * $MN2_PROPOSAL_INFO is a directory with the results of
 * running `agoric run xyz-script.js` one or more times.
 * Note: include the trailing / in the $MN_PROPOSAL_INFO.
 *
 * Each time, in addition to any *-permit.json and *.js files,
 * stdout is parsed with `parseProposals.js` to produce
 * a *-info.json file containing...
 *
 * @typedef {{
 *   bundles: string[],
 *   evals: { permit: string; script: string }[],
 * }} ProposalInfo
 *
 * Only the last path segment of ProposalInfo.bundles is used.
 * All bundles must be available in $MN2_PROPOSAL_INFO/bundles/ .
 *
 * $MN2_INSTANCE is a key in agoricNames.instance
 * where the mainnet-2 contract instance is expected to be installed.
 * A vstorage node under published by this name is also expected.
 */

import anyTest from 'ava';
import * as cpAmbient from 'child_process'; // TODO: use execa
import * as fspAmbient from 'fs/promises';
import { tmpName as tmpNameAmbient } from 'tmp';
import * as pathAmbient from 'path';
import * as processAmbient from 'process';
import dbOpenAmbient from 'better-sqlite3';

// TODO: factor out ambient authority from these
// or at least allow caller to supply authority.
import { mintIST } from '../lib/econHelpers.js';
import { agoric, wellKnownIdentities } from '../lib/cliHelper.js';
import {
  provisionSmartWallet,
  voteLatestProposalAndWait,
} from '../lib/commonUpgradeHelpers.js';

import { makeAgd } from '../lib/agd-lib.js';
import { Far, makeMarshal, makeTranslationTable } from '../lib/unmarshal.js';
import { Fail, NonNullish } from '../lib/assert.js';
import { dbTool } from '../lib/vat-status.js';
import { makeFileRW, makeWebCache, makeWebRd } from '../lib/webAsset.js';

/** @typedef {Awaited<ReturnType<typeof makeTestContext>>} TestContext */
/** @type {import('ava').TestFn<TestContext>}} */
const test = anyTest;

/**
 * URLs of release assets, including bundle hashes agreed by BLD stakers
 *
 * TODO: get permits, scripts from blockchain?
 * TODO: verify bundle contents against hashes?
 *
 * KREAd-rc1 to Mainnet
 * voting 2023-09-28 to 2023-10-01
 * https://agoric.explorers.guru/proposal/53
 */
const releaseInfo = {
  url: 'https://github.com/Kryha/KREAd/releases/tag/KREAd-rc1',
  /** @type {Record<string, ProposalInfo>} */
  buildAssets: {
    'kread-committee-info.json': {
      evals: [
        {
          permit: 'kread-invite-committee-permit.json',
          script: 'kread-invite-committee.js',
        },
      ],
      bundles: [
        '/Users/wietzes/.agoric/cache/b1-51085a4ad4ac3448ccf039c0b54b41bd11e9367dfbd641deda38e614a7f647d7f1c0d34e55ba354d0331b1bf54c999fca911e6a796c90c30869f7fb8887b3024.json',
        '/Users/wietzes/.agoric/cache/b1-a724453e7bfcaae1843be4532e18c1236c3d6d33bf6c44011f2966e155bc7149b904573014e583fdcde2b9cf2913cb8b337fc9daf79c59a38a37c99030fcf7dc.json',
      ],
    },
    'start-kread-info.json': {
      evals: [{ permit: 'start-kread-permit.json', script: 'start-kread.js' }],
      bundles: [
        '/Users/wietzes/.agoric/cache/b1-853acd6ba3993f0f19d6c5b0a88c9a722c9b41da17cf7f98ff7705e131860c4737d7faa758ca2120773632dbaf949e4bcce2a2cbf2db224fa09cd165678f64ac.json',
        '/Users/wietzes/.agoric/cache/b1-0c3363b8737677076e141a84b84c8499012f6ba79c0871fc906c8be1bb6d11312a7d14d5a3356828a1de6baa4bee818a37b7cb1ca2064f6eecbabc0a40d28136.json',
      ],
    },
  },
};

const dappAPI = {
  instance: 'kread', // agoricNames.instance key
  vstorageNode: 'kread',
};

const staticConfig = {
  deposit: '10000000ubld', // 10 BLD
  installer: 'gov1', // as in: agd keys show gov1
  proposer: 'validator',
  collateralPrice: 6, // conservatively low price. TODO: look up
  swingstorePath: '~/.agoric/data/agoric/swingstore.sqlite',
  releaseAssets: releaseInfo.url.replace('/tag/', '/download/') + '/',
  buildInfo: Object.values(releaseInfo.buildAssets),
  initialCoins: `20000000ubld`, // enough to provision a smartWallet
  accounts: {
    krgov1: {
      address: 'agoric1890064p6j3xhzzdf8daknd6kpvhw766ds8flgw',
      mnemonic:
        'loop clump life tattoo action wish loop garbage room custom tooth lunar increase major draw wage bind vanish order behind bounce unknown cry practice',
    },
    krgov2: {
      address: 'agoric1vqm5x5sj4lxmj2kem7x92tuhaum0k2yzyj6mgu',
      mnemonic:
        'expect wheel safe ankle caution vote reduce sell night pencil suit scrap tumble divorce element become result front hurt begin deputy liberty develop next',
    },
    kRoyalties: {
      address: 'agoric1yjc8llu3fugm7tgqye4rd5n92l9x2dhe30dazp',
      mnemonic:
        'talent approve render pool chief inch nuclear minor rhythm laundry praise swift clog neck shoot elder rely junior rule basket energy payment giggle torch',
    },
    kPlatform: {
      address: 'agoric1enwuyn2hzyyvt39x87tk9rhlkpqtyv9haj7mgs',
      mnemonic:
        'magic enrich village office myth depth upper pair april dad visit memory resemble castle lab surface globe debate chair upper army pony moon tone',
    },
  },
  ...dappAPI,
};

/**
 * Provide access to the outside world via t.context.
 */
const makeTestContext = async (io = {}) => {
  const {
    process: { env } = processAmbient,
    child_process: { execFileSync } = cpAmbient,
    dbOpen = dbOpenAmbient,
    fsp = fspAmbient,
    path = pathAmbient,
    tmpName = tmpNameAmbient,
  } = io;

  const src = makeWebRd(staticConfig.releaseAssets, { fetch });
  const td = await new Promise((resolve, reject) =>
    tmpName({ prefix: 'assets' }, (err, x) => (err ? reject(err) : resolve(x))),
  );
  const dest = makeFileRW(td, { fsp, path });
  td.teardown(() => assets.remove());
  const assets = makeWebCache(src, dest);

  const config = {
    assets,
    chainId: 'agoriclocal',
    ...staticConfig,
  };

  // This agd API is based on experience "productizing"
  // the inter bid CLI in #7939
  const agd = makeAgd({ execFileSync: execFileSync }).withOpts({
    keyringBackend: 'test',
  });

  const dbPath = staticConfig.swingstorePath.replace(/^~/, env.HOME);
  const swingstore = dbTool(dbOpen(dbPath, { readonly: true }));

  return { agd, agoric, swingstore, config };
};

test.before(async t => (t.context = await makeTestContext()));

const testIncludes = (t, needle, haystack, label, sense = true) => {
  t.log(needle, sense ? 'in' : 'not in', haystack.length, label, '?');
  const check = sense ? t.deepEqual : t.notDeepEqual;
  if (sense) {
    t.deepEqual(
      haystack.filter(c => c === needle),
      [needle],
    );
  } else {
    t.deepEqual(
      haystack.filter(c => c === needle),
      [],
    );
  }
};

test.serial(`pre-flight: not in agoricNames.instance`, async t => {
  const { config, agoric } = t.context;
  const { instance: target } = config;
  const { instance } = await wellKnownIdentities({ agoric });
  testIncludes(t, target, Object.keys(instance), 'instance keys', false);
});

const makeBoardUnmarshal = () => {
  const synthesizeRemotable = (_slot, iface) =>
    Far(iface.replace(/^Alleged: /, ''), {});

  const { convertValToSlot, convertSlotToVal } = makeTranslationTable(
    slot => Fail`unknown id: ${slot}`,
    synthesizeRemotable,
  );

  return makeMarshal(convertValToSlot, convertSlotToVal);
};

export const getContractInfo = async (path, io = {}) => {
  const m = makeBoardUnmarshal();
  const {
    agoric: { follow = agoric.follow },
    prefix = 'published.',
  } = io;
  console.log('@@TODO: prevent agoric follow hang', prefix, path);
  const txt = await follow('-lF', `:${prefix}${path}`, '-o', 'text');
  const { body, slots } = JSON.parse(txt);
  return m.fromCapData({ body, slots });
};

// XXX dead code - worth keeping somewhere?
const ensureMintLimit = async (targetNum, manager = 0, unit = 1_000_000) => {
  const io = { agoric };
  const [{ current }, metrics] = await Promise.all([
    getContractInfo(`vaultFactory.managers.manager${manager}.governance`, io),
    getContractInfo(`vaultFactory.managers.manager${manager}.metrics`, io),
  ]);
  const { totalDebt } = metrics;
  const {
    DebtLimit: { value: limit },
  } = current;
  const nums = {
    total: Number(totalDebt.value) / unit,
    limit: Number(limit.value) / unit,
    target: targetNum,
  };
  nums.target += nums.total;
  console.log(
    nums,
    nums.limit >= nums.target ? 'limit > target' : 'LIMIT TOO LOW',
  );
  if (nums.limit >= nums.target) return;
  throw Error('raising mint limit not impl');
};

const myISTBalance = async (agd, addr, denom = 'uist', unit = 1_000_000) => {
  const coins = await agd.query(['bank', 'balances', addr]);
  const coin = coins.balances.find(a => a.denom === denom);
  return Number(coin.amount) / unit;
};

const importBundleCost = (bytes, price = 0.002) => {
  return bytes * price;
};

/**
 * @param {number} myIST
 * @param {number} cost
 * @param {{
 *  unit?: number, padding?: number, minInitialDebt?: number,
 *  collateralPrice: number,
 * }} opts
 * @returns
 */
const mintCalc = (myIST, cost, opts) => {
  const {
    unit = 1_000_000,
    padding = 1,
    minInitialDebt = 6,
    collateralPrice,
  } = opts;
  const { round, max } = Math;
  const wantMinted = max(round(cost - myIST + padding), minInitialDebt);
  const giveCollateral = round(wantMinted / collateralPrice) + 1;
  const sendValue = round(giveCollateral * unit);
  return { wantMinted, giveCollateral, sendValue };
};

const loadedBundleIds = swingstore => {
  const ids = swingstore`SELECT bundleID FROM bundles`.map(r => r.bundleID);
  return ids;
};

/**
 * @param {string} cacheFn - e.g. /home/me.agoric/cache/b1-DEADBEEF.json
 */
const bundleDetail = cacheFn => {
  const fileName = NonNullish(cacheFn.split('/').at(-1));
  const id = fileName.replace(/\.json$/, '');
  const hash = id.replace(/^b1-/, '');
  return { fileName, endoZipBase64Sha512: hash, id };
};

test.serial('bundles not yet installed', async t => {
  const { swingstore, config } = t.context;
  const loaded = loadedBundleIds(swingstore);
  const info = staticConfig.buildInfo;
  for (const { bundles, evals } of info) {
    t.log(evals[0].script, evals.length, 'eval', bundles.length, 'bundles');
    for (const bundle of bundles) {
      const { id } = bundleDetail(bundle);
      testIncludes(t, id, loaded, 'loaded bundles', false);
    }
  }
});

/** @param {number[]} xs */
const sum = xs => xs.reduce((a, b) => a + b, 0);

/** @param {import('../lib/webAsset.js').WebCache} assets */
const readBundleSizes = async assets => {
  const info = staticConfig.buildInfo;
  const bundleSizes = await Promise.all(
    info
      .map(({ bundles }) =>
        bundles.map(b => assets.size(bundleDetail(b).fileName)),
      )
      .flat(),
  );
  const totalSize = sum(bundleSizes);
  return { bundleSizes, totalSize };
};

const ensureISTForInstall = async (agd, config, { log }) => {
  const { proposalDir, installer } = config;
  const { bundleSizes, totalSize } = await readBundleSizes(proposalDir);
  const cost = importBundleCost(sum(bundleSizes));
  log({ bundleSizes, totalSize, cost });

  const addr = agd.lookup(installer);
  const istBalance = await myISTBalance(agd, addr);

  if (istBalance > cost) {
    log('balance sufficient', { istBalance, cost });
    return;
  }
  const { sendValue, wantMinted, giveCollateral } = mintCalc(
    istBalance,
    cost,
    config,
  );
  log({ wantMinted });
  await mintIST(addr, sendValue, wantMinted, giveCollateral);
};

test.serial('ensure enough IST to install bundles', async t => {
  const { agd, config } = t.context;
  await ensureISTForInstall(agd, config, { log: t.log });
  t.pass();
});

const txAbbr = tx => {
  const { txhash, code, height, gas_used } = tx;
  return { txhash, code, height, gas_used };
};

test.serial('ensure bundles installed', async t => {
  const { agd, swingstore, agoric, config, io } = t.context;
  const { chainId, assets } = config;
  const loaded = loadedBundleIds(swingstore);
  const from = agd.lookup(config.installer);

  let todo = 0;
  let done = 0;
  for (const { bundles } of staticConfig.buildInfo) {
    todo += bundles.length;
    for (const bundle of bundles) {
      const { id, fileName, endoZipBase64Sha512 } = bundleDetail(bundle);
      if (loaded.includes(id)) {
        t.log('bundle already installed', id);
        done += 1;
        continue;
      }

      const bundleRd = await assets.storedPath(fileName);
      const result = await agd.tx(
        ['swingset', 'install-bundle', `@${bundleRd}`, '--gas', 'auto'],
        { from, chainId, yes: true },
      );
      t.log(txAbbr(result));
      t.is(result.code, 0);

      const info = await getContractInfo('bundles', { agoric, prefix: '' });
      t.log(info);
      done += 1;
      t.deepEqual(info, {
        endoZipBase64Sha512,
        error: null,
        installed: true,
      });
    }
  }
  t.is(todo, done);
});

/**
 * @param {Record<string, string>} record - e.g. { color: 'blue' }
 * @returns {string[]} - e.g. ['--color', 'blue']
 */
const flags = record => {
  return Object.entries(record)
    .map(([k, v]) => [`--${k}`, v])
    .flat();
};

test.serial('core eval prereqs: provision royalty, gov, ...', async t => {
  const { agd, config } = t.context;
  const { entries } = Object;

  for (const [name, { address, mnemonic }] of entries(config.accounts)) {
    try {
      agd.lookup(address);
      t.log(name, 'key already added');
      continue;
    } catch (_e) {}
    t.log('add key', name);
    agd.keys.add(name, mnemonic);
  }

  for (const [name, { address }] of entries(config.accounts)) {
    const walletPath = `published.wallet.${address}`;
    const data = await agd.query(['vstorage', 'data', walletPath]);
    if (data.value.length > 0) {
      t.log(name, 'wallet already provisioned');
      continue;
    }
    await provisionSmartWallet(address, config.initialCoins);
  }

  t.pass();
});

test.serial('core eval proposal passes', async t => {
  const { agd, swingstore, config } = t.context;
  const from = agd.lookup(config.proposer);
  const { chainId, deposit, assets, instance } = config;
  const info = { title: instance, description: `start ${instance}` };
  t.log('submit proposal', instance);

  // double-check that bundles are loaded
  const loaded = loadedBundleIds(swingstore);
  const { buildInfo } = staticConfig;
  for (const { bundles } of buildInfo) {
    for (const bundle of bundles) {
      const { id } = bundleDetail(bundle);
      testIncludes(t, id, loaded, 'loaded bundles');
    }
  }

  const evalNames = buildInfo
    .map(({ evals }) => evals)
    .flat()
    .map(e => [e.permit, e.script])
    .flat();
  const evalPaths = await Promise.all(evalNames.map(e => assets.storedPath(e)));
  t.log(evalPaths);
  console.debug('await tx', evalPaths);
  const result = await agd.tx(
    [
      'gov',
      'submit-proposal',
      'swingset-core-eval',
      ...evalPaths,
      ...flags({ ...info, deposit }),
      ...flags({ gas: 'auto', 'gas-adjustment': '1.2' }),
    ],
    { from, chainId, yes: true },
  );
  t.log(txAbbr(result));
  t.is(result.code, 0);

  console.debug('await voteLatestProposalAndWait', evalPaths);
  const detail = await voteLatestProposalAndWait();
  t.log(detail.proposal_id, detail.voting_end_time, detail.status);
  t.is(detail.status, 'PROPOSAL_STATUS_PASSED');
});

test.serial(`agoricNames.instance is populated`, async t => {
  const { config, agoric } = t.context;
  const { instance: target } = config;
  const { instance, brand } = await wellKnownIdentities({ agoric });
  const present = Object.keys(instance);
  testIncludes(t, target, present, 'instance keys');
});

// needs 2 brand names
test.todo(`agoricNames.brand is populated`);
test.todo('boardAux is populated');

test.serial('vstorage published.CHILD is present', async t => {
  const { agd, config } = t.context;
  const { vstorageNode } = config;
  const { children } = await agd.query(['vstorage', 'children', 'published']);
  testIncludes(t, vstorageNode, children, 'published children');
});

// KREAd specific below here
// TODO refactor this test for re-use across MN2 scripts

// TODO test this more robustly with the pausing feature
// This doesn't work with mainline KREAd becaues they don't have anything
// to write upon contract start. The pausing test will ensure there's
// a latestQuestion node published.
test.serial('kread commmittee is present', async t => {
  const { agd, config } = t.context;
  const { vstorageNode } = config;
  const { children } = await agd.query([
    'vstorage',
    'children',
    'published.committees',
  ]);
  testIncludes(t, 'kread-gov', children, 'published children');
});

test.todo('test contract features- mint character');
test.todo('test contract governance - pause');
test.todo('test contract governance - API');
