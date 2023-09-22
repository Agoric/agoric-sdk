// @ts-check
/* global process */
import anyTest from 'ava';
import * as cpAmbient from 'child_process'; // TODO: use execa?
import * as fspAmbient from 'fs/promises';
import * as pathAmbient from 'path';
import dbOpenAmbient from 'better-sqlite3';

import { makeAgd } from '../lib/agd-lib.js';
import { mintIST } from '../econHelpers.js';
import { agoric, wellKnownIdentities } from '../cliHelper.js';
import { Far, makeMarshal, makeTranslationTable } from '../lib/unmarshal.js';
import { Fail, NonNullish } from '../lib/assert.js';
import { dbTool } from './tools/vat-status.js';
import {
  provisionSmartWallet,
  voteLatestProposalAndWait,
} from '../commonUpgradeHelpers.js';

/** @typedef {Awaited<ReturnType<typeof makeTestContext>>} TestContext */
/** @type {import('ava').TestFn<TestContext>}} */
const test = anyTest;

const swingstorePath = '~/.agoric/data/agoric/swingstore.sqlite';

const fail = (t, msg) => {
  t && t.fail(msg);
  throw Error(msg);
};

/**
 * @param {string} root
 * @param {object} io
 * @param {typeof import('fs/promises')} io.fsp
 * @param {typeof import('path')} io.path
 *
 * @typedef {ReturnType<typeof makeFileRd>} FileRd
 */
const makeFileRd = (root, { fsp, path }) => {
  const make = there => {
    const self = {
      toString: () => there,
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
  deposit: '10000000ubld',
  installer: 'gov1', // name in keyring
  proposer: 'validator',
  collateralPrice: 6, // conservatively low price. TODO: look up
};

const makeTestContext = async t => {
  const agd = makeAgd({ execFileSync: cpAmbient.execFileSync }).withOpts({
    keyringBackend: 'test',
  });
  const { MN2_PROPOSAL_INFO, MN2_INSTANCE, FEE_ADDRESS, CHAINID, HOME } =
    process.env;

  const fullPath = swingstorePath.replace(/^~/, NonNullish(HOME));
  const ksql = dbTool(dbOpenAmbient(fullPath, { readonly: true }));

  const sdk = '/usr/src/agoric-sdk';
  return {
    agd,
    agoric,
    ksql,
    config: {
      proposalDir: makeFileRd(
        MN2_PROPOSAL_INFO || fail(t, '$MN2_PROPOSAL_INFO required'),
        { fsp: fspAmbient, path: pathAmbient },
      ),
      instance: MN2_INSTANCE || fail(t, '$MN2_INSTANCE required'), // agoricNames.instance key
      // assume agoricNames.instance matches vstorage node
      vstorageNode: MN2_INSTANCE,
      feeAddress: FEE_ADDRESS || fail(t, '$FEE_ADDRESS required'),
      chainId: CHAINID || fail(t, '$CHAINID required'),
      ...staticConfig,
    },
  };
};

test.before(async t => (t.context = await makeTestContext(t)));

/** @type {import('@endo/marshal').MakeMarshalOptions} */
const smallCaps = { serializeBodyFormat: 'smallcaps' };

const makeBoardUnmarshal = () => {
  const synthesizeRemotable = (_slot, iface) =>
    Far(iface.replace(/^Alleged: /, ''), {});

  const { convertValToSlot, convertSlotToVal } = makeTranslationTable(
    slot => Fail`unknown id: ${slot}`,
    synthesizeRemotable,
  );

  return makeMarshal(convertValToSlot, convertSlotToVal, smallCaps);
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
  // console.log('proposer balances:', coins);
  const coin = coins.balances.find(a => a.denom === denom);
  console.log(denom, 'balance:', coin);
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
  testIncludes(t, target, Object.keys(instance), 'instance keys');
});

const loadedBundleIds = ksql => {
  const ids = ksql`SELECT bundleID FROM bundles`.map(r => r.bundleID);
  return ids;
};

/**
 * @param {FileRd} rd
 * @returns {Promise<ProposalInfo[]>}
 *
 * @typedef {{ bundles: string[], evals: { permit: string; script: string }[] }} ProposalInfo
 */
const proposalInfo = rd =>
  rd
    .readDir()
    .then(files => files.filter(f => `${f}`.endsWith('-info.json')))
    .then(xs =>
      Promise.all(
        xs.map(x =>
          x.readText().then(txt => {
            /** @type {ProposalInfo} */
            const p = JSON.parse(txt);
            return p;
          }),
        ),
      ),
    );

/** @param {string} cacheFn */
const bundleDetail = cacheFn => {
  const fileName = cacheFn.split('/').at(-1) || fail(null, 'bad file name');
  const id = fileName.replace(/\.json$/, '');
  const hash = id.replace(/^b1-/, '');
  return { fileName, endoZipBase64Sha512: hash, id };
};

test.serial('bundles not yet installed', async t => {
  const { ksql, config } = t.context;
  const loaded = loadedBundleIds(ksql);
  const info = await proposalInfo(config.proposalDir);
  for (const { bundles, evals } of info) {
    t.log(evals[0].script, evals.length, 'eval', bundles.length, 'bundles');
    for (const bundle of bundles) {
      const { id } = bundleDetail(bundle);
      testIncludes(t, id, loaded, 'loaded bundles', false);
    }
  }
});

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
  const { agd, ksql, agoric, config, io } = t.context;
  const { chainId, proposalDir } = config;
  const loaded = loadedBundleIds(ksql);
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
 * @param {Record<string, string>} record
 * @returns {string[]}
 */
const flags = record => {
  return Object.entries(record)
    .map(([k, v]) => [`--${k}`, v])
    .flat();
};

test.todo(
  'core eval prereqs: provision recipient wallets',
  // , async t => {
  //   const { config } = t.context;
  //   const { feeAddress } = config;
  // TODO: check if already provisioned
  // await provisionSmartWallet(feeAddress, `20000000ubld`);
  //   t.pass();
  // }
);

test.serial('core eval', async t => {
  const { agd, ksql, config } = t.context;
  const from = agd.lookup(config.proposer);
  const { chainId, deposit, proposalDir, instance } = config;
  const info = { title: instance, description: `start ${instance}` };
  t.log('submit proposal', instance);

  const loaded = loadedBundleIds(ksql);
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

  const detail = await voteLatestProposalAndWait();
  t.log(detail.proposal_id, detail.voting_end_time, detail.status);
  t.is(detail.status, 'PROPOSAL_STATUS_PASSED');
});

test.serial(`agoricNames populated (instance)`, async t => {
  const { config, agoric } = t.context;
  const { instance: target } = config;
  const { instance, brand } = await wellKnownIdentities({ agoric });
  const present = Object.keys(instance);
  testIncludes(t, target, present, 'instance keys');
});

test.todo(`agoricNames populated (brand)`);

test.serial('check vstorage published.kread', async t => {
  const { agd, config } = t.context;
  const { vstorageNode } = config;
  const { children } = await agd.query(['vstorage', 'children', 'published']);
  testIncludes(t, vstorageNode, children, 'published children');
});

test.todo('test contract features- mint character');
test.todo('test contract governance - pause');
test.todo('test contract governance - API');
