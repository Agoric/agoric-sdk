// @ts-check
/* global process */
import * as cpAmbient from 'child_process'; // TODO: use execa?
import * as fspAmbient from 'node:fs/promises';
import { makeAgd } from '../tools/agd-lib.js';
import { mintIST } from '../../econHelpers.js';
import { agoric, wellKnownIdentities } from '../../cliHelper.js';
import { Far, makeMarshal, makeTranslationTable } from '../../lib/unmarshal.js';
import { Fail } from '../../lib/assert.js';

const config = {
  proposer: 'gov1', // name in keyring
  instance: 'KREAd', // agoricNames.instance
  collateralPrice: 6, // conservatively low price. TODO: look up
};

const importBundleCost = (bytes, price = 0.002) => {
  return bytes * price;
};

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
  } = io;
  const txt = await follow('-lF', `:published.${path}`, '-o', 'text');
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

/**
 * @param {string[]} argv
 * @param {Record<string, string | undefined>} env
 * @param {object} io
 * @param {typeof import('child_process').execFileSync} io.execFileSync
 * @param {typeof import('fs/promises').stat} io.stat
 */
const main = async (argv, env, { execFileSync, stat }) => {
  const { instance } = await wellKnownIdentities({ agoric });
  const agd = makeAgd({ execFileSync }).withOpts({ keyringBackend: 'test' });
  const present = Object.keys(instance);
  console.log(
    'instance',
    config.instance,
    'in agoricNames?',
    present.includes(config.instance),
  );

  const [_node, _script, proposal, bundle] = argv;
  console.log({ proposal, bundle });

  const myBal = async (addr, denom = 'uist', unit = 1_000_000) => {
    const coins = await agd.query(['bank', 'balances', addr]);
    // console.log('proposer balances:', coins);
    const coin = coins.balances.find(a => a.denom === denom);
    console.log(denom, 'balance:', coin);
    return Number(coin.amount) / unit;
  };

  const { round } = Math;
  const ensureInstallFunds = async (unit = 1_000_000, padding = 1) => {
    const addr = agd.lookup(config.proposer);
    console.log('proposer address', addr);
    const { size } = await stat(bundle);
    const cost = importBundleCost(size);
    console.log({ size, cost });
    for (
      let myIST = await myBal(addr);
      myIST < cost;
      myIST = await myBal(addr)
    ) {
      const wantMinted = round(cost - myIST + 1);
      console.log({ needed: wantMinted });
      if (wantMinted - padding <= 0) return;
      const giveCollateral = round(wantMinted / config.collateralPrice) + 1;
      const sendValue = round(giveCollateral * unit);
      await ensureMintLimit(wantMinted);
      console.log('minting IST', {
        sendValue,
        wantMinted: wantMinted,
        giveCollateral,
      });
      await mintIST(addr, sendValue, wantMinted, giveCollateral);
    }
  };

  await ensureInstallFunds();
};

main(
  // defensive copies of argv, env
  // to avoid global mutable state
  [...process.argv],
  { ...process.env },
  {
    execFileSync: cpAmbient.execFileSync,
    stat: fspAmbient.stat,
  },
).catch(console.error);
