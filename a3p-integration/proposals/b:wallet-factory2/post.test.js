import test from 'ava';
import { getIncarnation } from '@agoric/synthetic-chain/src/lib/vat-status.js';

test(`Wallet Factory vat was upgraded`, async t => {
  const incarnation = await getIncarnation('walletFactory');
  // 49:smart-wallet-nft bumped this from 0 to 1
  t.is(incarnation, 2);
});
