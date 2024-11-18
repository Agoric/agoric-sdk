import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareMinOrchestrator } from '../../src/orch-purse/mock-orch-chain.js';

test('mock orch chain', async t => {
  const baggage = makeScalarBigMapStore('test-baggage', { durable: true });
  const zone = makeDurableZone(baggage);
  const makeMinOrchestrator = prepareMinOrchestrator(zone);
  const orchestrator = makeMinOrchestrator();

  const aChain = orchestrator.getChain('a');
  const { chainId: aChainId } = await aChain.getChainInfo();
  t.is(aChainId, 'a');
  const aliceAcct = await aChain.makeAccount();
  const { chainId: aliceChainId, value: aliceAcctAddrValue } =
    aliceAcct.getAddress();
  t.is(aliceChainId, 'a');
  t.is(aliceAcctAddrValue, '0');
  const aliceBalances = await aliceAcct.getBalances();
  t.is(aliceBalances.length, 0);

  const bChain = orchestrator.getChain('b');
  const { chainId: bChainId } = await bChain.getChainInfo();
  t.is(bChainId, 'b');
  const bobAcct = await bChain.makeAccount();
  const { chainId: bobChainId, value: bobAcctAddrValue } = bobAcct.getAddress();
  t.is(bobChainId, 'b');
  t.is(bobAcctAddrValue, '0');
  const bobBalances = await bobAcct.getBalances();
  t.is(bobBalances.length, 0);
});
