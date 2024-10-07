import test from 'ava';

import {
  agops,
  ATOM_DENOM,
  bankSend,
  createBid,
  generateOracleMap,
  getDetailsMatchingVats,
  getInstanceBoardId,
  getISTBalance,
  getLiveOffers,
  getPriceQuote,
  getVaultPrices,
  getVatDetails,
  openVault,
  pushPrices,
  registerOraclesForBrand,
  USER1ADDR,
} from '@agoric/synthetic-chain';

import { BID_OFFER_ID } from './agd-tools.js';

export const checkForOracle = async (t, name) => {
  const instanceName = `${name}-USD price feed`;
  const instance = await getInstanceBoardId(instanceName);
  t.truthy(instance);
};

const checkPriceFeedVatsUpdated = async t => {
  const atomDetails = await getVatDetails('ATOM-USD_price_feed');
  // both the original and the new ATOM vault are incarnation 0
  t.is(atomDetails.incarnation, 0);
  const stAtomDetails = await getVatDetails('stATOM');
  t.is(stAtomDetails.incarnation, 0);
  await checkForOracle(t, 'ATOM');
  await checkForOracle(t, 'stATOM');
};

console.log('adding oracle for each brand');
const oraclesByBrand = generateOracleMap('f-priceFeeds', ['ATOM', 'stATOM']);
await registerOraclesForBrand('ATOM', oraclesByBrand);
await registerOraclesForBrand('stATOM', oraclesByBrand);

let roundId = 1;

const tryPushPrices = async t => {
  // There are no old prices for the other currencies.
  // const atomOutPre = await getPriceQuote('ATOM');
  // t.is(atomOutPre, '+12010000');
  // const stAtomOutPre = await getPriceQuote('stATOM');
  // t.is(stAtomOutPre, '+12010000');

  t.log('pushing new prices');
  await pushPrices(13.4, 'ATOM', oraclesByBrand, roundId);
  await pushPrices(13.7, 'stATOM', oraclesByBrand, roundId);
  roundId += 1;

  t.log('awaiting new quotes');
  const atomOut = await getPriceQuote('ATOM');
  t.is(atomOut, '+13400000');
  const stAtomOut = await getPriceQuote('stATOM');
  t.is(stAtomOut, '+13700000');
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
  await pushPrices(5.2, 'ATOM', oraclesByBrand, roundId);

  const atomOut = await getPriceQuote('ATOM');
  t.is(atomOut, '+5200000');
};

const checkNewAuctionVat = async t => {
  const details = await getDetailsMatchingVats('auctioneer');
  // This query matches both the auction and its governor, so double the count
  t.is(Object.keys(details).length, 3 * 2);
};

const countPriceFeedVats = async t => {
  // price_feed and governor, old and new for two tokens
  const priceFeedDetails = await getDetailsMatchingVats('price_feed');
  t.is(Object.keys(priceFeedDetails).length, 8);

  // Two old SPAs, and two new ones
  const details = await getDetailsMatchingVats('scaledPriceAuthority');
  t.is(Object.keys(details).length, 4);

  // ATOM vat name is something like zcf-DEADBEEF-ATOM_USD_price_feed
  // initial '-' distinguishes this from stAOM
  const atomDetails = await getDetailsMatchingVats('-ATOM-USD_price_feed');
  t.is(Object.keys(atomDetails).length, 4);

  const stAtomDetails = await getVatDetails('stATOM');
  t.is(Object.keys(stAtomDetails).length, 4);
  await Promise.all([checkForOracle(t, 'ATOM'), checkForOracle(t, 'stATOM')]);
};

const verifyVaultPriceUpdate = async t => {
  const ATOMManagerIndex = 0;
  const quote = await getVaultPrices(ATOMManagerIndex);
  t.true(quote.value[0].amountIn.brand.includes(' ATOM '));
  t.is(quote.value[0].amountOut.value, '+5200000');
};

// test.serial() isn't guaranteed to run tests in order, so we run the intended tests here
test('liquidation post upgrade', async t => {
  t.log('starting upgrade vaults test');
  await checkPriceFeedVatsUpdated(t);

  t.log('starting pushPrices');
  await tryPushPrices(t);

  t.log('create a new Bid for the auction');
  await createNewBid(t);

  t.log('open a marginal vault');
  await openMarginalVault(t);

  t.log('trigger Auction');
  await triggerAuction(t);

  t.log('check new auction');
  await checkNewAuctionVat(t);

  t.log('count vats');
  await countPriceFeedVats(t);

  t.log('verify Vault priceUpdate');
  await verifyVaultPriceUpdate(t);
});
