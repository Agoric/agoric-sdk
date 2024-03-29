import test from 'ava';
import { agd } from '@agoric/synthetic-chain';

import { GOV1ADDR } from '@agoric/synthetic-chain';

console.log(`TT start`, GOV1ADDR);

const getAuctionData = async book => {
  // const auctionStatsRaw = await agd.query(
  //   'vstorage',
  //   'data',
  //   '--output',
  //   'json',
  //   `published.auction.${book}`,
  // );

  const auctionStatsRaw = 'foo';
  console.log(`TT `, auctionStatsRaw);
  const body = JSON.parse(JSON.parse(auctionStatsRaw.value).values[0]);
  const bodyTruncated = JSON.parse(body.body.substring(1));
  return bodyTruncated;
};

console.log(`TT later`);

test.skip('trigger auction', async t => {
  console.log(`start TRIGGER`);
  t.log('trigger');
  await null;
  console.log('before', await getAuctionData('book1'));
  // await pushPrices(5.2, 'ATOM');

  // // agd query -o json  vstorage data published.priceFeed.stOSMO-USD_price_feed |&
  // //   jq '.value | fromjson | .values[0] | fromjson | .body[1:] | fromjson | .amountOut.value'
  // const atomOut = await getPriceQuote('ATOM');
  // t.is(atomOut, '+5200000');

  // TODO  check USER1 purse for proceeds
  // TODO check auction records for trade
  console.log('after', await getAuctionData('book1'));
});
