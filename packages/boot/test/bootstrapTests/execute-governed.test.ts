import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.js';

// swingSetTestKit is the part we're really interested in
const test: TestFn<WalletFactoryTestContext> = anyTest;

test.before('bootstrap', async t => {
  const config = '@agoric/vm-config/decentral-itest-orchestration-config.json';
  t.context = await makeWalletFactoryContext(t, config, {});
});
test.after.always(t => t.context.shutdown?.());

test.serial('terminate a bad auctioneer & its governor', async t => {
  const { buildProposal, evalProposal } = t.context;

  const targets = [
    'board03040:ATOM-USD_price_feed', // TODO: auctioneer
  ];

  const materials = buildProposal(
    '@agoric/builders/scripts/vats/upgrade-governor-instance.js',
    targets,
  );
  await evalProposal(materials);

  t.log('TODO: check that the price feed is really dead');
  t.pass();
});
