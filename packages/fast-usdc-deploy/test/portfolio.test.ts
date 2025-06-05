import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.ts';
import { BridgeId } from '@agoric/internal';
import { AckBehavior } from '@aglocal/boot/tools/supports.ts';

const test: TestFn<WalletFactoryTestContext> = anyTest;

test.before('bootstrap', async t => {
  const config = '@agoric/vm-config/decentral-itest-orchestration-config.json';
  // TODO: impact testing
  const ctx = await makeWalletFactoryContext(t, config);

  t.context = ctx;
});
test.after.always(t => t.context.shutdown?.());

test.serial('contract starts; adds to agoricNames', async t => {
  const {
    agoricNamesRemotes,
    bridgeUtils,
    buildProposal,
    evalProposal,
    refreshAgoricNamesRemotes,
    readPublished,
    walletFactoryDriver: wfd,
  } = t.context;

  // inbound `startChannelOpenInit` responses immediately.
  // needed since the Fusdc StartFn relies on an ICA being created
  bridgeUtils.setAckBehavior(
    BridgeId.DIBC,
    'startChannelOpenInit',
    AckBehavior.Immediate,
  );
  bridgeUtils.setBech32Prefix('noble');

  const materials = buildProposal(
    '../../portfolio-contract/scripts/portfolio.build.js', // XXX cross-package
    // TODO: ['--net', 'MAINNET'],
  );
  await evalProposal(materials);

  // update now that fastUsdc is instantiated
  refreshAgoricNamesRemotes();
  t.truthy(agoricNamesRemotes.instance.ymax0);
});
