/* eslint-env node */
import test from 'ava';

import {
  addPreexistingOracles,
  agops,
  ATOM_DENOM,
  bankSend,
  createBid,
  getInstanceBoardId,
  getISTBalance,
  getLiveOffers,
  getPriceQuote,
  getVaultPrices,
  openVault,
  pushPrices,
  USER1ADDR,
} from '@agoric/synthetic-chain';
import { readFile } from 'node:fs/promises';
import { getDetailsMatchingVats } from './vatDetails.js';

const { env } = process;

const oraclesByBrand = new Map();

let roundId = 2;

const setupOracles = async t => {
  const atomOutPre = await getPriceQuote('ATOM');
  t.is(atomOutPre, '+12010000');

  await addPreexistingOracles('ATOM', oraclesByBrand);

  await pushPrices(11.2, 'ATOM', oraclesByBrand, roundId);
  roundId += 1;
};

const checkNewQuotes = async t => {
  t.log('awaiting new quotes');
  const atomOut = await getPriceQuote('ATOM');
  t.is(atomOut, '+11200000');
};

export const BID_OFFER_ID = 'bid-vaultUpgrade-test3';
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
  roundId += 1;

  const atomOut = await getPriceQuote('ATOM');
  t.is(atomOut, '+5200000');
};

// contract vat names are based on bundleID
const ORIGINAL_AUCTION_VAT_NAME = 'zcf-b1-a5683-auctioneer';

const newAuctioneerFromNewBundle = details => {
  for (const detail of details) {
    if (
      !detail.vatName.includes('governor') &&
      detail.vatName !== ORIGINAL_AUCTION_VAT_NAME
    ) {
      return true;
    }
  }
  return false;
};

const checkAuctionVat = async t => {
  const details = await getDetailsMatchingVats('auctioneer');

  t.true(newAuctioneerFromNewBundle(details));
  // This query matches both the auction and its governor, so double the count
  t.true(Object.keys(details).length > 2);
};

const verifyVaultPriceUpdate = async t => {
  const quote = await getVaultPrices(0);

  t.true(quote.value[0].amountIn.brand.includes(' ATOM '));
  t.is(quote.value[0].amountOut.value, '+5200000');
};

const verifyAuctionInstance = async t => {
  const newAuctionInstance = await getInstanceBoardId('auctioneer');
  const oldInstance = await readFile(
    `${env.HOME}/.agoric/previousInstance.json`,
    'utf-8',
  );

  console.log(
    `new: ${newAuctionInstance} should be different from ${oldInstance}`,
  );
  t.not(newAuctionInstance, oldInstance);
};

// test.serial() isn't guaranteed to run tests in order, so we run the intended tests here
test('liquidation post upgrade', async t => {
  t.log('setup Oracles');
  await setupOracles(t);

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

  t.log('auction instance changed in agoricNames');
  await verifyAuctionInstance(t);
});
