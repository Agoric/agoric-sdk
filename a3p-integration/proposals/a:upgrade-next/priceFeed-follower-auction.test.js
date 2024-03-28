import test from 'ava';
import { getVatDetails } from '@agoric/synthetic-chain';

test('new auction vat', async t => {
  const auctionDetails = await getVatDetails('auction');
  console.log(`AUC `, auctionDetails);

  t.true(Number(auctionDetails.vatID.substring(1)) > 50, 'auction is new');
});
