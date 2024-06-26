import test from 'ava';

import {
  agops,
  ATOM_DENOM,
  getISTBalance,
  getVatDetails,
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
import { getDetailsMatchingVats } from './vatDetails.js';

const checkPriceFeedVatsUpdated = async t => {
  const atomDetails = await getVatDetails('ATOM-USD_price_feed');
  // both the original and the new ATOM vault are incarnation 0
  t.is(atomDetails.incarnation, 0);
  const stAtomDetails = await getVatDetails('stATOM');
  t.is(stAtomDetails.incarnation, 0);
  const stOsmoDetails = await getVatDetails('stOSMO');
  t.is(stOsmoDetails.incarnation, 0);
  const stTiaDetails = await getVatDetails('stTIA');
  t.is(stTiaDetails.incarnation, 0);
  await Promise.all([
    checkForOracle(t, 'ATOM'),
    checkForOracle(t, 'stATOM'),
    checkForOracle(t, 'stTIA'),
    checkForOracle(t, 'stOSMO'),
    checkForOracle(t, 'stkATOM'),
  ]);
};

const BRANDNAMES = ['ATOM', 'stATOM', 'stTIA', 'stOSMO', 'stkATOM'];
const oraclesByBrand = generateOracleMap('u16', BRANDNAMES);

const checkNewQuotes = async t => {
  t.log('awaiting new quotes');
  const atomOut = await getPriceQuote('ATOM');
  t.is(atomOut, '+11200000');
  const tiaOut = await getPriceQuote('stTIA');
  t.is(tiaOut, '+11300000');
  const stAtomOut = await getPriceQuote('stATOM');
  t.is(stAtomOut, '+11400000');
  const osmoOut = await getPriceQuote('stOSMO');
  t.is(osmoOut, '+11500000');
  const stkAtomOut = await getPriceQuote('stkATOM');
  t.is(stkAtomOut, '+11600000');
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
  await pushPrices(5.2, 'ATOM', oraclesByBrand);

  const atomOut = await getPriceQuote('ATOM');
  t.is(atomOut, '+5200000');
};

const checkAuctionVat = async t => {
  const details = await getDetailsMatchingVats('auctioneer');
  // This query matches both the auction and its governor, so double the count
  t.true(Object.keys(details).length > 2);
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

  t.log('check new price quotes');
  await checkNewQuotes(t);

  t.log('create a new Bid for the auction');
  await createNewBid(t);

  t.log('open a marginal vault');
  await openMarginalVault(t);

  t.log('trigger Auction');
  await triggerAuction(t);

  t.log('make new auction');
  await checkAuctionVat(t);

  t.log('vault price updated');
  await verifyVaultPriceUpdate(t);
});
