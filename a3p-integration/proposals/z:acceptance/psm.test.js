/* eslint-env node */
/**
 * @file The goal of this file is to implement a set of tests to make sure PSM works properly
 *
 * Here are the steps we want to take;
 * 1 - Change swap fees and mint limit according to "psmTestSpecs" below
 * 2 - Create a new user using agd.keys
 * 3 - Fund new user with a stable coin from the VALIDATOR
 *     - Do not provision manually
 * 4 - Make sure new user is able to mint IST from PSM (fees are applied)
 * 5 - Make sure new user can pay their debt and get their anchor (fees are applied)
 * 6 - Make sure mint limit is adhered
 */

import {
  agd,
  agoric,
  getUser,
  GOV1ADDR,
  GOV2ADDR,
} from '@agoric/synthetic-chain';
import { waitUntilAccountFunded } from '@agoric/client-utils';
import test from 'ava';
import { NonNullish } from '@agoric/internal/src/errors.js';
import {
  adjustBalancesIfNotProvisioned,
  bankSend,
  checkGovParams,
  checkSwapExceedMintLimit,
  checkSwapSucceeded,
  getPsmMetrics,
  implementPsmGovParamChange,
  initializeNewUser,
  logRecord,
  maxMintBelowLimit,
  psmSwap,
} from './test-lib/psm-lib.js';
import { getBalances } from './test-lib/utils.js';

// Export these from synthetic-chain?
const USDC_DENOM = NonNullish(process.env.USDC_DENOM);
const PSM_PAIR = NonNullish(process.env.PSM_PAIR);
const PSM_INSTANCE = `psm-${PSM_PAIR.replace('.', '-')}`;

const psmSwapIo = {
  now: Date.now,
  follow: agoric.follow,
  setTimeout,
};

const psmTestSpecs = {
  govParams: {
    giveMintedFeeVal: 10n, // in %
    wantMintedFeeVal: 10n, // in %
    mintLimit: 500n * 1_000_000n, // in IST
    votingDuration: 1, // in minutes
  },
  psmInstance: PSM_INSTANCE,
  anchor: PSM_INSTANCE.split('-')[2],
  newUser: {
    name: 'new-psm-trader',
    fund: {
      denom: USDC_DENOM,
      value: '300000000', // 300 USDC_axl
    },
  },
  otherUser: {
    name: 'gov1',
    fund: {
      denom: USDC_DENOM,
      value: '1000000000', // 1000 USDC_axl
    },
    toIst: {
      value: 500, // in IST
    },
  },
  toIst: {
    value: 50, // in IST
  },
  fromIst: {
    value: 50, // in USDC_axl
  },
};

test.serial('change gov params', async t => {
  await implementPsmGovParamChange(
    {
      address: GOV1ADDR,
      instanceName: psmTestSpecs.psmInstance,
      newParams: psmTestSpecs.govParams,
      votingDuration: psmTestSpecs.govParams.votingDuration,
    },
    { committeeAddrs: [GOV1ADDR, GOV2ADDR], position: 0 },
    { now: Date.now, follow: agoric.follow },
  );

  await checkGovParams(
    t,
    {
      GiveMintedFee: {
        type: 'ratio',
        value: {
          numerator: { value: psmTestSpecs.govParams.giveMintedFeeVal * 100n }, // convert to bps
        },
      },
      WantMintedFee: {
        type: 'ratio',
        value: {
          numerator: { value: psmTestSpecs.govParams.wantMintedFeeVal * 100n }, // convert to bps
        },
      },
      MintLimit: {
        type: 'amount',
        value: {
          value: psmTestSpecs.govParams.mintLimit,
        },
      },
    },
    psmTestSpecs.psmInstance.split('-')[2],
  );
});

test.serial('initialize new user', async t => {
  const {
    newUser: { name, fund },
  } = psmTestSpecs;

  await initializeNewUser(name, fund, { query: agd.query, setTimeout });
  t.pass();
});

test.serial('swap into IST using agd with default gas', async t => {
  const {
    newUser: { name },
    anchor,
    toIst,
    govParams: { wantMintedFeeVal },
  } = psmTestSpecs;

  const psmTrader = await getUser(name);

  const [metricsBefore, balances] = await Promise.all([
    getPsmMetrics(anchor),
    getBalances([psmTrader]),
  ]);

  const balancesBefore = await adjustBalancesIfNotProvisioned(
    balances,
    psmTrader,
  );
  logRecord('METRICS', metricsBefore, t.log);
  logRecord('BALANCES', balancesBefore, t.log);

  await psmSwap(
    psmTrader,
    [
      'swap',
      '--pair',
      PSM_PAIR,
      '--wantMinted',
      toIst.value,
      '--feePct',
      wantMintedFeeVal,
    ],
    psmSwapIo,
  );

  await checkSwapSucceeded(t, metricsBefore, balancesBefore, {
    wantMinted: toIst.value,
    trader: psmTrader,
    fee: Number(wantMintedFeeVal) / 100, // fee has to be between 0 and 1
    anchor,
  });
});

test.serial('swap out of IST', async t => {
  const {
    newUser: { name },
    anchor,
    fromIst,
    govParams: { giveMintedFeeVal },
  } = psmTestSpecs;

  const psmTrader = await getUser(name);

  const [metricsBefore, balancesBefore] = await Promise.all([
    getPsmMetrics(anchor),
    getBalances([psmTrader]),
  ]);

  logRecord('METRICS', metricsBefore, t.log);
  logRecord('BALANCES', balancesBefore, t.log);

  await psmSwap(
    psmTrader,
    [
      'swap',
      '--pair',
      PSM_PAIR,
      '--giveMinted',
      fromIst.value,
      '--feePct',
      giveMintedFeeVal,
    ],
    psmSwapIo,
  );

  await checkSwapSucceeded(t, metricsBefore, balancesBefore, {
    giveMinted: fromIst.value,
    trader: psmTrader,
    fee: Number(giveMintedFeeVal) / 100, // fee has to be between 0 and 1
    anchor,
  });
});

test.serial('mint limit is adhered', async t => {
  const {
    otherUser: {
      fund: { denom, value },
      name,
    },
    govParams,
    anchor,
  } = psmTestSpecs;

  // Fund other user
  const otherAddr = await getUser(name);
  await bankSend(otherAddr, `${value}${denom}`);
  await waitUntilAccountFunded(
    otherAddr,
    { log: t.log, query: agd.query, setTimeout },
    { denom, value: parseInt(value, 10) },
    { errorMessage: `${otherAddr} could not be funded with ${value}${denom}` },
  );

  const [metricsBefore, balancesBefore] = await Promise.all([
    getPsmMetrics(anchor),
    getBalances([otherAddr]),
  ]);

  logRecord('METRICS', metricsBefore, t.log);
  logRecord('BALANCES', balancesBefore, t.log);

  const { maxMintableValue, wantFeeValue } = await maxMintBelowLimit(anchor);
  const maxMintFeesAccounted = Math.floor(
    maxMintableValue * (1 - wantFeeValue),
  );
  t.log({ maxMintableValue, wantFeeValue, maxMintFeesAccounted });

  // Send a swap, should fail because mint limit is exceeded
  await t.throwsAsync(
    () =>
      psmSwap(
        otherAddr,
        [
          'swap',
          '--pair',
          PSM_PAIR,
          '--wantMinted',
          maxMintFeesAccounted / 1000000 + 2, // Make sure we exceed the limit
          '--feePct',
          govParams.wantMintedFeeVal,
        ],
        psmSwapIo,
      ),
    { message: /not succeeded/ },
  );

  // Now check if failed with correct error message
  await checkSwapExceedMintLimit(t, otherAddr, metricsBefore);

  // Send another swap offer, this time should succeed
  await psmSwap(
    otherAddr,
    [
      'swap',
      '--pair',
      PSM_PAIR,
      '--wantMinted',
      maxMintFeesAccounted / 1000000,
      '--feePct',
      govParams.wantMintedFeeVal,
    ],
    psmSwapIo,
  );

  // Make sure swap succeeded
  await checkSwapSucceeded(t, metricsBefore, balancesBefore, {
    wantMinted: maxMintFeesAccounted / 1000000,
    trader: otherAddr,
    fee: Number(govParams.wantMintedFeeVal) / 100, // fee has to be between 0 and 1
    anchor,
  });
});
