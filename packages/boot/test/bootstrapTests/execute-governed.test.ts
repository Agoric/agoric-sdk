import type { BridgeHandler } from '@agoric/vats';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.js';

const nodeRequire = createRequire(import.meta.url);
const asset = async (specifier: string) =>
  readFile(nodeRequire.resolve(specifier), 'utf8');

// swingSetTestKit is the part we're really interested in
const test: TestFn<WalletFactoryTestContext> = anyTest;

type CoreEval = { json_permits: string; js_code: string };
test.before('bootstrap', async t => {
  const config = '@agoric/vm-config/decentral-itest-orchestration-config.json';
  t.context = await makeWalletFactoryContext(t, config, {});
});
test.after.always(t => t.context.shutdown?.());

test.serial('terminate BLAH BLAH', async t => {
  const { swingsetTestKit } = t.context;
  const runCoreEvals = async (evals: CoreEval[]) => {
    const bridgeMessage = { type: 'CORE_EVAL', evals };
    const { EV } = swingsetTestKit.runUtils;
    const coreEvalBridgeHandler: BridgeHandler = await EV.vat(
      'bootstrap',
    ).consumeItem('coreEvalBridgeHandler');
    await EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);
  };

  const script = await asset(
    '@agoric/builders/scripts/vats/terminate-from-boardid.js',
  );
  await runCoreEvals([{ js_code: script, json_permits: 'true' }]);
  t.log('TODO: verify that the contract is gone');
  t.pass();
});

test.skip('terminate a bad auctioneer & its governor', async t => {
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
