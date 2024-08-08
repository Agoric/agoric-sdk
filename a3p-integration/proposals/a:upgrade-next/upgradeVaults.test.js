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
  bankSend,
  BID_OFFER_ID,
  checkForOracle,
  createBid,
  generateOracleMap,
  getLiveOffers,
  getPriceQuote,
  getVaultPrices,
  pushPrices,
} from './agd-tools.js';
import { getDetailsByVatId, getDetailsMatchingVats } from './vatDetails.js';
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

await null;

const INTERESTING_VATS = [7, 9, 29, 43, 45, 46, 48, 68, 70, 73, 74];

async function printAllVatLevels() {
  const deets7 = await getDetailsByVatId(`v${7}`);
  const n7 = await getVatObjectCount(`v7`);
  console.log('UPG ', '7', n7, deets7.name);

  const deets9 = await getDetailsByVatId(`v9`);
  const n9 = await getVatObjectCount(`v9`);
  console.log('UPG ', '9', n9, deets9.name);

  for (let vatId = 25; vatId < 75; vatId += 1) {
    const deets = await getDetailsByVatId(`v${vatId}`);
    const n = await getVatObjectCount(`v${vatId}`);
    console.log('UPG ', vatId, n, deets.name);
  }
}
await printAllVatLevels();

const surveyVats = async (index = '') => {
  await null;
  const counts = [];
  for (const v of INTERESTING_VATS) {
    const n = await getVatObjectCount(`v${v}`);
    counts.push(n);
  }
  const tot = await getObjectCount();
  console.log(`SURVEY: ${index}, ${tot}, ${counts}`);
  return counts;
};

const checkPriceFeedVatsUpdated = async t => {
  const atomDetails = await getVatDetails('-ATOM-USD_price_feed');
  // both the original and the new ATOM vault are incarnation 0
  t.is(atomDetails.incarnation, 0);
  console.log('UPG ATOM', atomDetails.incarnation);

  await Promise.all([checkForOracle(t, 'ATOM'), checkForOracle(t, 'stATOM')]);
  const balances = await agd.query('bank', 'balances', GOV3ADDR);
  console.log('GOV3 Balances', balances);

  await surveyVats();

  await logGovBalances();
};

const replenishBalances = async t => {
  await Promise.all([
    // gov1 has plenty
    // mintIST(GOV1ADDR, 100000, 600, 100),
    mintIST(GOV2ADDR, 100000, 600, 100),
    mintIST(GOV3ADDR, 100000, 600, 100),
  ]);
  await logGovBalances();
  t.pass('foo');
};

const BRANDNAMES = ['ATOM', 'stATOM'];
console.log('adding oracle for each brand');
const oraclesByBrand = generateOracleMap('u16', BRANDNAMES);
let currentRound = 1;

const tryPushPrices = async t => {
  const atomOutPre = await getPriceQuote('ATOM');
  t.is(atomOutPre, '+11200000');

  t.log('pushing new prices');
  await pushPrices(11.9, 'ATOM', oraclesByBrand, currentRound);
  await logGovBalances();
  currentRound += 1;

  t.log('awaiting new quotes');
  const atomOut = await getPriceQuote('ATOM');
  t.is(atomOut, '+11200000');
};

const createNewBid = async t => {
  await createBid('20', USER1ADDR, BID_OFFER_ID);
  const liveOffer = await getLiveOffers(USER1ADDR);
  t.true(liveOffer[0].includes(BID_OFFER_ID));
};

const openMarginalVault = async t => {
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
};

const triggerAuction = async t => {
  await pushPrices(5.2, 'ATOM', oraclesByBrand, currentRound);
  currentRound += 1;
  await logGovBalances();

  const atomOut = await getPriceQuote('ATOM');
  t.is(atomOut, '+5200000');
};

const checkAuctionVat = async t => {
  const details = await getDetailsMatchingVats('auctioneer');
  // This query matches both the auction and its governor, so double the count
  t.true(Object.keys(details).length > 2);
};

const pushNewPrice = async (t, i) => {
  const j = i % 2 ? -5 : 5;
  await pushPrices(42.5 + j, 'ATOM', oraclesByBrand, currentRound);
  currentRound += 1;
  await logGovBalances();

  return surveyVats(i);
};

const sendManyPrices = async t => {
  await null;
  const balances = await agd.query('bank', 'balances', GOV3ADDR);
  console.log('GOV3 Balances', balances);

  const p = [];
  for (let i = 0; i < 200; i += 1) {
    // for (let i = 0; i < 10; i += 1) {
    p.push(await pushNewPrice(t, i));
  }

  console.log('SURVEY', p);

  await printAllVatLevels();

  t.pass();
};

const verifyVaultPriceUpdate = async t => {
  const quote = await getVaultPrices(0);

  t.true(quote.value[0].amountIn.brand.includes(' ATOM '));
  t.is(quote.value[0].amountOut.value, '+5200000');
};

// test.serial() isn't guaranteed to run tests in order, so we run the intended tests here
test('liquidation post upgrade', async t => {
  t.log('starting upgrade vaults test');
  await checkPriceFeedVatsUpdated(t);

  console.log('replenish Balances');
  await replenishBalances(t);

  t.log('push Prices');
  await tryPushPrices(t);

  t.log('create a new Bid for the auction');
  await createNewBid(t);

  t.log('open a marginal vault');
  await openMarginalVault(t);

  t.log('trigger Auction');
  await triggerAuction(t);

  t.log('make new auction');
  await checkAuctionVat(t);

  t.log('send many price updates');
  await sendManyPrices(t);

  t.log('vault price updated');
  await verifyVaultPriceUpdate(t);
});
