// @ts-check
/* global process */
import anyTest from 'ava';
import * as cpAmbient from 'child_process'; // TODO: use execa?
import * as fspAmbient from 'node:fs/promises';
import dbOpenAmbient from 'better-sqlite3';

import { makeAgd } from './tools/agd-lib.js';
import { mintIST } from '../econHelpers.js';
import { agoric, wellKnownIdentities } from '../cliHelper.js';
import { Far, makeMarshal, makeTranslationTable } from '../lib/unmarshal.js';
import { Fail, NonNullish } from '../lib/assert.js';
import { dbTool } from './tools/vat-status.js';

/** @typedef {Awaited<ReturnType<typeof makeTestContext>>} TestContext */
/** @type {import('ava').TestFn<TestContext>}} */
const test = anyTest;

const swingstorePath = '~/.agoric/data/agoric/swingstore.sqlite';

const makeTestContext = async () => {
  const agd = makeAgd({ execFileSync: cpAmbient.execFileSync }).withOpts({
    keyringBackend: 'test',
  });
  const { MN2_BUNDLE, MN2_INSTANCE, CHAINID, HOME } = process.env;

  const fullPath = swingstorePath.replace(/^~/, NonNullish(HOME));
  const ksql = dbTool(dbOpenAmbient(fullPath, { readonly: true }));

  return {
    agd,
    agoric,
    ksql,
    config: {
      instance: MN2_INSTANCE, // agoricNames.instance key
      bundle: MN2_BUNDLE,
      installer: 'gov1', // name in keyring
      collateralPrice: 6, // conservatively low price. TODO: look up
      chainId: CHAINID,
    },
    io: { stat: fspAmbient.stat, readFile: fspAmbient.readFile },
  };
};

test.before(async t => (t.context = await makeTestContext()));

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
 *
 * @param {number} myIST
 * @param {number} cost
 * @param {{ unit?: number, padding?: number, collateralPrice: number }} opts
 * @returns
 */
const mintCalc = (myIST, cost, opts) => {
  const { unit = 1_000_000, padding = 1, collateralPrice } = opts;
  const { round } = Math;
  const wantMinted = round(cost - myIST + 1);
  const giveCollateral = round(wantMinted / collateralPrice) + 1;
  const sendValue = round(giveCollateral * unit);
  return { wantMinted, giveCollateral, sendValue };
};

const fail = (t, msg) => {
  t.fail(msg);
  throw Error(msg);
};

test.serial(`pre-flight: not in agoricNames.instance`, async t => {
  const { config, agoric } = t.context;
  const { instance: target = fail(t, '$MN2_INSTANCE required') } = config;
  const { instance } = await wellKnownIdentities({ agoric });
  const present = Object.keys(instance);
  t.log({ present: present.length, target });
  t.false(present.includes(target));
});

test.serial('ensure enough IST to install bundle', async t => {
  const { agd, io, config } = t.context;

  const { bundle = fail(t, '$MN2_BUNDLE required') } = config;
  const { size } = await io.stat(bundle);
  const cost = importBundleCost(size);
  t.log({ size, cost, bundle });

  const addr = agd.lookup(config.installer);
  const istBalance = await myISTBalance(agd, addr);
  if (istBalance > cost) {
    t.log('balance sufficient', { istBalance, cost });
    t.pass();
    return;
  }
  const { sendValue, wantMinted, giveCollateral } = mintCalc(
    istBalance,
    cost,
    config,
  );
  t.log({ wantMinted });
  await mintIST(addr, sendValue, wantMinted, giveCollateral);
  t.pass();
});

const loadedBundleIds = ksql => {
  const ids = ksql`SELECT bundleID FROM bundles`.map(r => r.bundleID);
  return ids;
};

test.serial('bundle not yet installed', async t => {
  const { ksql, config, io } = t.context;
  const { bundle = fail(t, '$MN2_BUNDLE required') } = config;
  const data = await io.readFile(bundle, 'utf8').then(s => JSON.parse(s));
  const { endoZipBase64Sha512 } = data;
  const ids = loadedBundleIds(ksql);
  t.log('swingstore bundle count', ids.length, endoZipBase64Sha512);
  t.false(ids.includes(`b1-${endoZipBase64Sha512}`));
});

test.serial('install bundle', async t => {
  const { agd, agoric, config, io } = t.context;
  const from = agd.lookup(config.installer);
  const {
    chainId = fail(t, '$CHAINID required'),
    bundle = fail(t, '$MN2_BUNDLE required'),
  } = config;

  const data = await io.readFile(bundle, 'utf8').then(s => JSON.parse(s));
  const { endoZipBase64Sha512 } = data;

  const result = await agd.tx(
    ['swingset', 'install-bundle', `@${bundle}`, '--gas', 'auto'],
    { from, chainId, yes: true },
  );
  const { txhash, code, height, gas_used } = result;
  t.log({ txhash, code, height, gas_used });
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
