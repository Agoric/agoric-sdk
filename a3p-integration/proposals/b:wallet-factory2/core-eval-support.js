// @ts-check
import {
  Far,
  makeMarshal,
  makeTranslationTable,
} from '@agoric/synthetic-chain/src/lib/unmarshal.js';
import { Fail, NonNullish } from '@agoric/synthetic-chain/src/lib/assert.js';

// TODO: factor out ambient authority from these
// or at least allow caller to supply authority.
import {
  getISTBalance,
  mintIST,
} from '@agoric/synthetic-chain/src/lib/econHelpers.js';
import { agoric } from '@agoric/synthetic-chain/src/lib/cliHelper.js';

// move to unmarshal.js?
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

// not really core-eval related
export const testIncludes = (t, needle, haystack, label, sense = true) => {
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

/**
 * @param {Record<string, string>} record - e.g. { color: 'blue' }
 * @returns {string[]} - e.g. ['--color', 'blue']
 */
export const flags = record => {
  return Object.entries(record)
    .map(([k, v]) => [`--${k}`, v])
    .flat();
};

export const txAbbr = tx => {
  const { txhash, code, height, gas_used } = tx;
  return { txhash, code, height, gas_used };
};

export const loadedBundleIds = swingstore => {
  const ids = swingstore`SELECT bundleID FROM bundles`.map(r => r.bundleID);
  return ids;
};

/**
 * @param {string} cacheFn - e.g. /home/me.agoric/cache/b1-DEADBEEF.json
 */
export const bundleDetail = cacheFn => {
  const fileName = NonNullish(cacheFn.split('/').at(-1));
  const id = fileName.replace(/\.json$/, '');
  const hash = id.replace(/^b1-/, '');
  return { fileName, endoZipBase64Sha512: hash, id };
};

const importBundleCost = (bytes, price = 0.002) => {
  return bytes * price;
};

/**
 * @typedef {{
 *   bundles: string[],
 *   evals: { permit: string; script: string }[],
 * }} ProposalInfo
 */

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

/**
 *
 * @param {ReturnType<typeof import('../lib/agd-lib.js').makeAgd>} agd
 * @param {*} config
 * @param {number} bytes total bytes
 * @param {{ log: (...args: any[]) => void }} io
 * @returns
 */
export const ensureISTForInstall = async (agd, config, bytes, { log }) => {
  const cost = importBundleCost(bytes);
  log({ totalSize: bytes, cost });
  const { installer } = config;
  const addr = agd.lookup(installer);
  const istBalance = await getISTBalance(addr);

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
