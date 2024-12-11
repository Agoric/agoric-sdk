import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareMockOrchestratorKit } from '../../../src/mock-orch-ertp/mock-orch/mock-orch.js';

test('mock orch chain', async t => {
  const baggage = makeScalarBigMapStore('test-baggage', { durable: true });
  const zone = makeDurableZone(baggage);
  const makeMockOrchestratorKit = prepareMockOrchestratorKit(zone);
  const { orchestrator, admin } = makeMockOrchestratorKit();

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

  const denomMint = admin.makeDenom('bucks', aChain);
  await denomMint.mintTo(
    aliceAcct.getAddress(),
    harden({
      denom: 'bucks',
      value: 300n,
    }),
  );
  t.deepEqual(await aliceAcct.getBalances(), [{ denom: 'bucks', value: 300n }]);

  await aliceAcct.transfer(
    bobAcct.getAddress(),
    harden({
      denom: 'bucks',
      value: 100n,
    }),
  );
  t.deepEqual(await aliceAcct.getBalances(), [{ denom: 'bucks', value: 200n }]);
  t.deepEqual(await bobAcct.getBalances(), [{ denom: 'bucks', value: 100n }]);
});
