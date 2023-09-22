import { promises as fs } from 'fs';
import assert from 'assert';

import {
  agd,
  agops,
  agopsLocation,
  executeCommand,
  smallCapsContext,
  wellKnownIdentities,
} from '../lib/cliHelper.js';
import {
  HOME,
  ATOM_DENOM,
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
} from '../lib/constants.js';
import {
  waitForBlock,
  executeOffer,
  getUser,
  provisionSmartWallet,
} from '../lib/commonUpgradeHelpers.js';

const govAccounts = [GOV1ADDR, GOV2ADDR, GOV3ADDR];

const acceptEC = async () => {
  console.log('ACTIONS Tickling the wallets so they are revived');

  let voter = 0;
  for (const account of govAccounts) {
    console.log(`${account}: 1: Accepting EC Committee`);

    try {
      const params = ['ec', 'committee', '--send-from', account];
      await executeCommand(agopsLocation, params, {
        timeout: 30000,
      });
    } catch (error) {
      console.warn(error.message);
    }

    await waitForBlock(3);

    console.log(`${account}: 2: Accepting EC Committee`);

    try {
      await agops.ec('committee', '--send-from', account, '--voter', voter);
    } catch (error) {
      console.warn(error.message);
    }

    voter += 1;

    await waitForBlock(3);

    console.log(`${account}: Accepting EC Charter`);

    try {
      await agops.ec('charter', '--send-from', account);
    } catch (error) {
      console.warn(error.message);
    }
  }
};

const acceptOracles = oracles => {
  const promiseArray = [];

  for (const oracle of oracles) {
    console.log(`${oracle.address}: Accept oracle invitations`);
    promiseArray.push(
      executeOffer(
        oracle.address,
        agops.oracle('accept', '--offerId', oracle.id),
      ),
    );
  }

  return Promise.all(promiseArray);
};

const proposeNewAuctionParams = async (
  address,
  startFequency,
  clockStep,
  priceLockPeriod,
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

const voteForNewParams = (accounts, position) => {
  return Promise.all(
    accounts.map(account =>
      agops.ec('vote', '--forPosition', position, '--send-from', account),
    ),
  );
};

const paramChangeOfferGeneration = async (
  previousOfferId,
  voteDur,
  debtLimit,
  io = {},
) => {
  const { now = Date.now, agoricNames = await wellKnownIdentities(io) } = io;
  const { brand, instance } = agoricNames;
  assert(instance.VaultFactory);
  assert(brand.IST);
  assert(brand.ATOM);

  const ISTunit = 1_000_000n; // aka displayInfo: { decimalPlaces: 6 }
  const voteDurSec = BigInt(voteDur);
  const debtLimitValue = BigInt(debtLimit) * ISTunit;
  const toSec = ms => BigInt(Math.round(ms / 1000));

  const id = `propose-${now()}`;
  const deadline = toSec(now()) + voteDurSec;

  const { smallCaps, toCapData } = smallCapsContext();

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

  return toCapData(body);
};

export const provisionWallet = async user => {
  const userKeyData = await agd.keys('add', user, '--keyring-backend=test');
  await fs.writeFile(`${HOME}/.agoric/${user}.key`, userKeyData.mnemonic);

  const userAddress = await getUser(user);

  await provisionSmartWallet(
    userAddress,
    `20000000ubld,100000000${ATOM_DENOM}`,
  );
  await waitForBlock();
};

export const implementNewAuctionParams = async (
  address,
  oracles,
  startFequency,
  clockStep,
  priceLockPeriod,
) => {
  await acceptEC();
  await waitForBlock(3);

  await acceptOracles(oracles);

  await proposeNewAuctionParams(
    address,
    startFequency,
    clockStep,
    priceLockPeriod,
  );

  console.log('ACTIONS voting for new auction params');
  await voteForNewParams(govAccounts, 0);

  console.log('ACTIONS wait for the vote deadline to pass');
  await new Promise(r => setTimeout(r, 65000));
};

export const proposeNewDebtCeiling = async address => {
  const charterAcceptOfferId = await agops.ec(
    'find-continuing-id',
    '--for',
    `${'charter\\ member\\ invitation'}`,
    '--from',
    address,
  );

  return executeOffer(
    address,
    paramChangeOfferGeneration(charterAcceptOfferId, 30, 123_000_000),
  );
};

export const raiseDebtCeiling = async address => {
  console.log('ACTIONS Raising debt limit');

  await proposeNewDebtCeiling(address);
  await voteForNewParams(govAccounts, 0);

  console.log('ACTIONS wait for the vote to pass');
  await new Promise(r => setTimeout(r, 65000));
};

export const pushPrice = (oracles, price = 10.0) => {
  console.log(`ACTIONS pushPrice ${price}`);
  const promiseArray = [];

  for (const oracle of oracles) {
    console.log(`Pushing Price from oracle ${oracle.address}`);

    promiseArray.push(
      executeOffer(
        oracle.address,
        agops.oracle(
          'pushPriceRound',
          '--price',
          price,
          '--oracleAdminAcceptOfferId',
          oracle.id,
        ),
      ),
    );
  }

  return Promise.all(promiseArray);
};
