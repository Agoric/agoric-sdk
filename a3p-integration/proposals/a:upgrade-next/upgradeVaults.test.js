import test from 'ava';

import {
  agd,
  agops,
  ATOM_DENOM,
  getISTBalance,
  getVatDetails,
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
  mintIST,
  openVault,
  USER1ADDR,
} from '@agoric/synthetic-chain';

import {
  addOraclesForBrand,
  bankSend,
  BID_OFFER_ID,
  checkForOracle,
  createBid,
  getLiveOffers,
  getPriceQuote,
  pushPrices,
} from './agd-tools.js';
import { getDetailsMatchingVats } from './vatDetails.js';
import { getObjectCount, getVatObjectCount } from './sql-tools.js';

const logGovBalances = async () => {
  const [IST1, IST2, IST3] = await Promise.all([
    getISTBalance(GOV1ADDR),
    getISTBalance(GOV2ADDR),
    getISTBalance(GOV3ADDR),
  ]);
  console.log(' BALANCES', {
    [GOV1ADDR]: IST1,
    [GOV2ADDR]: IST2,
    [GOV3ADDR]: IST3,
  });
};

const surveyVats = async (index = '') => {
  await null;
  const counts = [];
  const interestingVats = [7, 9, 43, 46, 48, 69, 74];
  for (const v of interestingVats) {
    const n = await getVatObjectCount(`v${v}`);
    counts.push(n);
  }
  console.log(`SURVEY: ${index} ${counts}`);
  return counts;
};

test.serial('check PriceFeed Vats Updated', async t => {
  const atomDetails = await getVatDetails('ATOM-USD_price_feed');
  // both the original and the new ATOM vault are incarnation 0
  t.is(atomDetails.incarnation, 0);
  console.log('UPG ATOM', atomDetails.incarnation);

  await checkForOracle(t, 'ATOM');
  const balances = await agd.query('bank', 'balances', GOV3ADDR);
  console.log('GOV3 Balances', balances);

  await surveyVats();

  await logGovBalances();
});

test.serial('replenish balances', async t => {
  const count = await getObjectCount();
  console.log({ count });

  await Promise.all([
    // gov1 has plenty
    // mintIST(GOV1ADDR, 100000, 600, 100),
    mintIST(GOV2ADDR, 100000, 600, 100),
    mintIST(GOV3ADDR, 100000, 600, 100),
  ]);
  await logGovBalances();
  t.pass('foo');
});

const oraclesByBrand = new Map();
let currentRound = 1;

test.serial('tryPushPrices', async t => {
  const atomOutPre = await getPriceQuote('ATOM');
  t.is(atomOutPre, '+12010000');

  t.log('adding oracle for each brand');
  await addOraclesForBrand('ATOM', oraclesByBrand);

  t.log('pushing new prices');
  await pushPrices(11.2, 'ATOM', oraclesByBrand, currentRound);
  await logGovBalances();
  currentRound += 1;

  t.log('awaiting new quotes');
  const atomOut = await getPriceQuote('ATOM');
  t.is(atomOut, '+11200000');
});

test.serial('createNewBid', async t => {
  await createBid('20', USER1ADDR, BID_OFFER_ID);
  const liveOffer = await getLiveOffers(USER1ADDR);
  t.true(liveOffer[0].includes(BID_OFFER_ID));
});

test.serial('openMarginalVault', async t => {
  let user1IST = await getISTBalance(USER1ADDR);
  await bankSend(USER1ADDR, `20000000${ATOM_DENOM}`);
  const currentVaults = await agops.vaults('list', '--from', USER1ADDR);

  t.log('opening a vault');
  await openVault(USER1ADDR, 5, 10);
  user1IST += 5;
  const istBalanceAfterVaultOpen = await getISTBalance(USER1ADDR);
  t.is(istBalanceAfterVaultOpen, user1IST);

  const activeVaultsAfter = await agops.vaults('list', '--from', USER1ADDR);
  t.log(currentVaults, activeVaultsAfter);
  t.true(
    activeVaultsAfter.length > currentVaults.length,
    `vaults count should increase, ${activeVaultsAfter.length}, ${currentVaults.length}`,
  );
});

test.serial('trigger Auction', async t => {
  await pushPrices(5.2, 'ATOM', oraclesByBrand, currentRound);
  currentRound += 1;
  await logGovBalances();

  const atomOut = await getPriceQuote('ATOM');
  t.is(atomOut, '+5200000');
});

test.serial('verify NewAuctionVat', async t => {
  const details = await getDetailsMatchingVats('auctioneer');
  // This query matches both the auction and its governor, so double the count
  t.true(Object.keys(details).length > 2);
});

const pushNewPrice = async (t, i) => {
  const j = i % 2 ? -5 : 5;
  await pushPrices(42.5 + j, 'ATOM', oraclesByBrand, currentRound);
  currentRound += 1;
  await logGovBalances();

  return surveyVats(i);
};

test.serial('send many prices', async t => {
  await null;
  const balances = await agd.query('bank', 'balances', GOV3ADDR);
  console.log('GOV3 Balances', balances);

  const p = [];
  for (let i = 0; i < 500; i += 1) {
    p.push(await pushNewPrice(t, i));
  }

  console.log('SURVEY', p);
  t.pass();
});
