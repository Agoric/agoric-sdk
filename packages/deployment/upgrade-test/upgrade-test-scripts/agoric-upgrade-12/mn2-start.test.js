// @ts-check
/* global process */
import anyTest from 'ava';
import * as cpAmbient from 'child_process'; // TODO: use execa?
import * as fspAmbient from 'fs/promises';
import * as pathAmbient from 'path';
import dbOpenAmbient from 'better-sqlite3';
import { execaNode } from 'execa';

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
      feeAddress: FEE_ADDRESS || fail(t, '$FEE_ADDRESS required'),
      installer: 'gov1', // name in keyring
      proposer: 'validator',
      collateralPrice: 6, // conservatively low price. TODO: look up
      chainId: CHAINID || fail(t, '$CHAINID required'),
    },
    io: { stat: fspAmbient.stat, readFile: fspAmbient.readFile, execaNode },
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

test.serial(`pre-flight: not in agoricNames.instance`, async t => {
  const { config, agoric } = t.context;
  const { instance: target } = config;
  const { instance } = await wellKnownIdentities({ agoric });
  const present = Object.keys(instance);
  t.log({ present: present.length, target });
  t.false(present.includes(target));
});

const loadedBundleIds = ksql => {
  const ids = ksql`SELECT bundleID FROM bundles`.map(r => r.bundleID);
  return ids;
};

const JSONParse = s => JSON.parse(s);

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

const bundleDetail = cacheFn => {
  const fileName = cacheFn.split('/').at(-1);
  const hash = fileName.replace(/\.json$/, '');
  const id = `b1-${hash}`;
  return { fileName, endoZipBase64Sha512: hash, id };
};

test.serial('bundles not yet installed', async t => {
  const { ksql, config } = t.context;
  const loaded = loadedBundleIds(ksql);
  t.log('swingstore bundle count', loaded.length);
  const info = await proposalInfo(config.proposalDir);
  for (const { bundles, evals } of info) {
    t.log(evals[0].script, evals.length, 'eval', bundles.length, 'bundles');
    for (const bundle of bundles) {
      const { id } = bundleDetail(bundle);
      t.false(loaded.includes(id), id);
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

const ensureISTForInstall = async t => {
  const { agd, io, config } = t.context;
  const { proposalDir } = config;
  const { bundleSizes, totalSize } = await readBundleSizes(proposalDir);
  const cost = importBundleCost(sum(bundleSizes));
  t.log({ bundleSizes, totalSize, cost });

  const addr = agd.lookup(config.installer);
  const istBalance = await myISTBalance(agd, addr);
  if (istBalance > cost) {
    t.log('balance sufficient', { istBalance, cost });
    return;
  }
  const { sendValue, wantMinted, giveCollateral } = mintCalc(
    istBalance,
    cost,
    config,
  );
  t.log({ wantMinted });
  await mintIST(addr, sendValue, wantMinted, giveCollateral);
};

test.only('ensure enough IST to install bundles', async t => {
  await ensureISTForInstall(t);
  t.pass();
});

const txAbbr = tx => {
  const { txhash, code, height, gas_used } = tx;
  return { txhash, code, height, gas_used };
};

test.serial('ensure bundles installed', async t => {
  const { ids, id } = await contractBundleStatus(t);
  if (ids.includes(id)) {
    t.log('bundle already installed', id);
    t.pass();
    return;
  }

  const { agd, agoric, config, io } = t.context;

  const from = agd.lookup(config.installer);
  const { chainId, bundle } = config;

  const { endoZipBase64Sha512 } = await readContractBundle(config, io);

  await ensureISTForInstall(t);
  const result = await agd.tx(
    ['swingset', 'install-bundle', `@${bundle}`, '--gas', 'auto'],
    { from, chainId, yes: true },
  );
  t.log(txAbbr(result));
  // t.log(result);
  t.is(result.code, 0);

  const info = await getContractInfo('bundles', { agoric, prefix: '' });
  t.log(info);
  t.deepEqual(info, {
    endoZipBase64Sha512,
    error: null,
    installed: true,
  });
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

test.serial('core eval prereqs', async t => {
  const { config } = t.context;
  const { feeAddress } = config;
  // TODO: check if already provisioned
  // await provisionSmartWallet(feeAddress, `20000000ubld`);
  t.pass();
});

test.serial('core eval', async t => {
  const { agd, config, io } = t.context;
  const deposit = '10000000ubld';
  const from = agd.lookup(config.proposer);
  const { chainId, permit, script, instance } = config;
  const defanged = `${script}-DEFANG`;
  t.log({ defanged });
  await io.execaNode(config.clean, [script]).pipeStdout(defanged);
  const info = { title: instance, description: `start ${instance}` };
  t.log('submit proposal', instance);
  const result = await agd.tx(
    [
      'gov',
      'submit-proposal',
      'swingset-core-eval',
      permit,
      defanged,
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

test.todo('check agoricNames.instance, agoricNames.brand');

test.todo('check vstorage published.kread');
