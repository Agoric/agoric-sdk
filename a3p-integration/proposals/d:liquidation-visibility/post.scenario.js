import test from "ava";
import {
  assertVisibility,
  bidByDiscount,
  bidByPrice,
  makeAuctionTimerDriver,
  makeTestContext, openVault, pushPrice,
} from "./core-eval-support.js";
import { getContractInfo } from "@agoric/synthetic-chain";
import { Liquidation} from "./spec.test.js";

const config = {
  swingstorePath: '~/.agoric/data/agoric/swingstore.sqlite',
  installer: 'user1',
  oracles: [
    { address: 'gov1', acceptId: 'gov1-accept-invite'},
    { address: 'gov2', acceptId: 'gov2-accept-invite'},
  ]
};

test.before(async t => {
  const context = await makeTestContext({ testConfig: config });
  const auctionTimerDriver = await makeAuctionTimerDriver(context, 'user1');
  t.context = {
    ...context,
    auctionTimerDriver,
  };
});

test.serial('open vaults', async t => {
  const { config, agops, agd } = t.context;

  const address = await agd.lookup(config.installer);

  let userVaults = await agops.vaults('list', '--from', address);
  console.log('Log: ', userVaults);

  for (const { collateral, ist } of Liquidation.setup.vaults) {
    await openVault(address, ist, collateral, "STARS");
  }

  userVaults = await agops.vaults('list', '--from', address);
  console.log('Log: ', userVaults);

  t.pass();
});

test.serial('place bid', async t => {
  const { agd } = t.context;
  const user1Addr = agd.lookup('user1');
  const colKeyword = 'STARS';

  for (const bid of Liquidation.setup.bids) {
    if (bid.price) {
      await bidByPrice(user1Addr, bid.give, colKeyword, bid.price);
    } else if(bid.discount) {
      await bidByDiscount(user1Addr, bid.give, colKeyword, bid.discount);
    }
  }
  t.pass();
});

test.serial('trigger liquidation', async t => {
  const { agoric, config, agd } = t.context;
  const { roundId: roundIdBefore, startedBy } = await getContractInfo('priceFeed.STARS-USD_price_feed.latestRound', { agoric });
  const gov1Addr = agd.lookup('gov1');

  const oraclesConfig = startedBy === gov1Addr ? config.oracles.reverse() : config.oracles;

  await pushPrice(t, Liquidation.setup.price.trigger, oraclesConfig);

  const { roundId: roundIdAfter } = await getContractInfo('priceFeed.STARS-USD_price_feed.latestRound', { agoric });

  t.is(roundIdAfter, roundIdBefore + 1n);
});

test.serial('start auction', async t => {
  const { startAuction } = t.context.auctionTimerDriver;
  config.currentAuction = await startAuction();
  t.pass();
});

test.serial('make sure all bids are settled', async t => {
  const { advanceAuctionStepMulti, advanceAuctionStepByOne } = t.context.auctionTimerDriver;
  await advanceAuctionStepByOne();
  await advanceAuctionStepMulti(5);
  t.pass();
});

test.serial('finish the current auction', async t => {
  const { startAuction } = t.context.auctionTimerDriver;
  await startAuction();
  t.pass();
});

test.serial('assert visibility', async t => {
  await assertVisibility(t, 2, 0, config.currentAuction);
});
