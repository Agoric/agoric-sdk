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

/** @typedef {Awaited<ReturnType<typeof makeTestContext>>} TestContext */
/** @type {import('ava').TestFn<TestContext>}} */
let test = anyTest;

// If $MN2_PROPOSAL_INFO is not set, no tests are run.
if (!('MN2_PROPOSAL_INFO' in processAmbient.env)) {
  console.log('MN2_PROPOSAL_INFO not set. Skipping all tests.');
  const noop = (..._args) => {};
  // @ts-expect-error
  test = noop;
  Object.assign(test, { before: noop, serial: noop });
}

/**
 * Reify file read access as an object.
 *
 * @param {string} root
 * @param {object} io
 * @param {Pick<typeof import('fs/promises'), 'stat' | 'readFile' | 'readdir'>} io.fsp
 * @param {Pick<typeof import('path'), 'join'>} io.path
 *
 * @typedef {ReturnType<typeof makeFileRd>} FileRd
 */
const makeFileRd = (root, { fsp, path }) => {
  /** @param {string} there */
  const make = there => {
    const self = {
      toString: () => there,
      /** @param {string[]} segments */
      join: (...segments) => make(path.join(there, ...segments)),
      stat: () => fsp.stat(there),
      readText: () => fsp.readFile(there, 'utf8'),
      readDir: () =>
        fsp.readdir(there).then(names => names.map(ref => self.join(ref))),
    };
    return self;
  };
  return make(root);
};

const staticConfig = {
  deposit: '10000000ubld', // 10 BLD
  installer: 'gov1', // as in: agd keys show gov1
  proposer: 'validator',
  collateralPrice: 6, // conservatively low price. TODO: look up
  swingstorePath: '~/.agoric/data/agoric/swingstore.sqlite',
  initialCoins: `20000000ubld`,
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
  } = io;

  const theEnv = name => {
    const value = env[name];
    if (value === undefined) {
      throw Error(`$${name} required`);
    }
    return value;
  };

  const config = {
    proposalDir: makeFileRd(theEnv('MN2_PROPOSAL_INFO'), { fsp, path }),
    instance: theEnv('MN2_INSTANCE'), // agoricNames.instance key
    vstorageNode: theEnv('MN2_INSTANCE'),
    // TODO: feeAddress: theEnv('FEE_ADDRESS'),
    chainId: env.CHAINID || 'agoriclocal',
    royaltyThingy: theEnv('GOV3ADDR'),
    ...staticConfig,
  };

  // This agd API is based on experience "productizing"
  // the inter bid CLI in #7939
  const agd = makeAgd({ execFileSync: execFileSync }).withOpts({
    keyringBackend: 'test',
  });

  const dbPath = staticConfig.swingstorePath.replace(/^~/, theEnv('HOME'));
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
 * @param {FileRd} rd - assumed to contain ProposalInfo
 * @returns {Promise<ProposalInfo[]>}
 */
const proposalInfo = async rd => {
  const all = await rd.readDir();
  const runInfos = all.filter(f => `${f}`.endsWith('-info.json'));
  return Promise.all(
    runInfos.map(async infoRd => {
      const txt = await infoRd.readText();
      /** @type {ProposalInfo} */
      const p = JSON.parse(txt);
      return p;
    }),
  );
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
  const info = await proposalInfo(config.proposalDir);
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

/** @param {FileRd} proposalDir */
const readBundleSizes = async proposalDir => {
  const info = await proposalInfo(proposalDir);
  const bundleRds = info
    .map(({ bundles }) =>
      bundles.map(b => proposalDir.join('bundles', bundleDetail(b).fileName)),
    )
    .flat();
  const bundleSizes = await Promise.all(
    bundleRds.map(rd => rd.stat().then(st => st.size)),
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
  const { chainId, proposalDir } = config;
  const loaded = loadedBundleIds(swingstore);
  const from = agd.lookup(config.installer);

  let todo = 0;
  let done = 0;
  for (const { bundles } of await proposalInfo(proposalDir)) {
    todo += bundles.length;
    for (const bundle of bundles) {
      const { id, fileName, endoZipBase64Sha512 } = bundleDetail(bundle);
      if (loaded.includes(id)) {
        t.log('bundle already installed', id);
        done += 1;
        continue;
      }

      const bundleRd = proposalDir.join('bundles', fileName);
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
  const { chainId, deposit, proposalDir, instance } = config;
  const info = { title: instance, description: `start ${instance}` };
  t.log('submit proposal', instance);
  console.debug('submit proposal', instance);

  // double-check that bundles are loaded
  const loaded = loadedBundleIds(swingstore);
  const proposals = await proposalInfo(proposalDir);
  for (const { bundles } of proposals) {
    for (const bundle of bundles) {
      const { id } = bundleDetail(bundle);
      testIncludes(t, id, loaded, 'loaded bundles');
    }
  }

  const evalNames = proposals
    .map(({ evals }) => evals)
    .flat()
    .map(e => [e.permit, e.script])
    .flat();
  const evalPaths = evalNames.map(e => proposalDir.join(e).toString());
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
