/* eslint-disable @jessie.js/safe-await-separator */
/* eslint-env node */

import { strict as assert } from 'node:assert';

import {
  addUser,
  agops,
  agoric,
  ATOM_DENOM,
  executeOffer,
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
  provisionSmartWallet,
  waitForBlock,
} from '@agoric/synthetic-chain';

const govAccounts = [GOV1ADDR, GOV2ADDR, GOV3ADDR];

export const ISTunit = 1_000_000n; // aka displayInfo: { decimalPlaces: 6 }

// XXX likely longer than necessary
const VOTING_WAIT_MS = 65 * 1000;

const proposeNewAuctionParams = async (
  address: string,
  startFequency: any,
  clockStep: any,
  priceLockPeriod: any,
) => {
  const charterAcceptOfferId = await agops.ec(
    'find-continuing-id',
    '--for',
    `${'charter\\ member\\ invitation'}`,
    '--from',
    address,
  );

  return executeOffer(
    address,
    agops.auctioneer(
      'proposeParamChange',
      '--charterAcceptOfferId',
      charterAcceptOfferId,
      '--start-frequency',
      startFequency,
      '--clock-step',
      clockStep,
      '--price-lock-period',
      priceLockPeriod,
    ),
  );
};

const voteForNewParams = (accounts: string[], position: number) => {
  console.log('ACTIONS voting for position', position, 'using', accounts);
  return Promise.all(
    accounts.map((account: string) =>
      agops.ec('vote', '--forPosition', position, '--send-from', account),
    ),
  );
};

const paramChangeOfferGeneration = async (
  previousOfferId: string,
  voteDur: number,
  debtLimit: number | bigint,
) => {
  const voteDurSec = BigInt(voteDur);
  const debtLimitValue = BigInt(debtLimit) * ISTunit;
  const toSec = (ms: number) => BigInt(Math.round(ms / 1000));

  const id = `propose-${Date.now()}`;
  const deadline = toSec(Date.now()) + voteDurSec;

  const zip = (xs: any[], ys: { [x: string]: any }) =>
    xs.map((x: any, i: string | number) => [x, ys[i]]);
  const fromSmallCapsEntries = (txt: string) => {
    const { body, slots } = JSON.parse(txt);
    const theEntries = zip(JSON.parse(body.slice(1)), slots).map(
      ([[name, ref], boardID]) => {
        const iface = ref.replace(/^\$\d+\./, '');
        return [name, { iface, boardID }];
      },
    );
    return Object.fromEntries(theEntries);
  };

  const slots = [] as string[]; // XXX global mutable state
  const smallCaps = {
    Nat: (n: any) => `+${n}`,
    // XXX mutates obj
    ref: (obj: { ix: string; boardID: any; iface: any }) => {
      if (obj.ix) return obj.ix;
      const ix = slots.length;
      slots.push(obj.boardID);
      obj.ix = `$${ix}.Alleged: ${obj.iface}`;
      return obj.ix;
    },
  };

  const instance = fromSmallCapsEntries(
    await agoric.follow('-lF', ':published.agoricNames.instance', '-o', 'text'),
  );
  assert(instance.VaultFactory);

  const brand = fromSmallCapsEntries(
    await agoric.follow('-lF', ':published.agoricNames.brand', '-o', 'text'),
  );
  assert(brand.IST);
  assert(brand.ATOM);

  const body = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        invitationMakerName: 'VoteOnParamChange',
        previousOffer: previousOfferId,
        source: 'continuing',
      },
      offerArgs: {
        deadline: smallCaps.Nat(deadline),
        instance: smallCaps.ref(instance.VaultFactory),
        params: {
          DebtLimit: {
            brand: smallCaps.ref(brand.IST),
            value: smallCaps.Nat(debtLimitValue),
          },
        },
        path: {
          paramPath: {
            key: {
              collateralBrand: smallCaps.ref(brand.ATOM),
            },
          },
        },
      },
      proposal: {},
    },
  };

  const capData = { body: `#${JSON.stringify(body)}`, slots };
  return JSON.stringify(capData);
};
export const provisionWallet = async (user: string) => {
  const userAddress = await addUser(user);

  await provisionSmartWallet(
    userAddress,
    `20000000ubld,100000000${ATOM_DENOM}`,
  );
  await waitForBlock();
};

export const implementNewAuctionParams = async (
  address: string,
  oracles: { address: string; id: string }[],
  startFequency: number,
  clockStep: number,
  priceLockPeriod: number,
) => {
  await waitForBlock(3);

  await proposeNewAuctionParams(
    address,
    startFequency,
    clockStep,
    priceLockPeriod,
  );

  console.log('ACTIONS voting for new auction params');
  await voteForNewParams(govAccounts, 0);

  console.log('ACTIONS wait for the vote deadline to pass');
  await new Promise(r => setTimeout(r, VOTING_WAIT_MS));
};

export const proposeNewDebtCeiling = async (
  address: string,
  debtLimit: number | bigint,
) => {
  const charterAcceptOfferId = await agops.ec(
    'find-continuing-id',
    '--for',
    `${'charter\\ member\\ invitation'}`,
    '--from',
    address,
  );

  return executeOffer(
    address,
    paramChangeOfferGeneration(charterAcceptOfferId, 30, debtLimit),
  );
};

export const setDebtLimit = async (
  address: string,
  debtLimit: number | bigint,
) => {
  console.log('ACTIONS Setting debt limit');

  await proposeNewDebtCeiling(address, debtLimit);
  await voteForNewParams(govAccounts, 0);

  console.log('ACTIONS wait for the vote to pass');
  await new Promise(r => setTimeout(r, VOTING_WAIT_MS));
};
