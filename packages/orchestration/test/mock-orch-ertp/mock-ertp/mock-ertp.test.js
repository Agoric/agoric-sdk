import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareMockOrchestratorKit } from '../../../src/mock-orch-ertp/mock-orch/mock-orch.js';
import { prepareERTPOrchestrator } from '../../../src/mock-orch-ertp/mock-ertp/mock-ertp.js';

/**
 * @import {ERef} from '@endo/eventual-send'
 *
 * @import {Amount} from '@agoric/ertp'
 */

test('mock ertp', async t => {
  const baggage = makeScalarBigMapStore('test-baggage', { durable: true });
  const zone = makeDurableZone(baggage);
  const mockOrchestratorKit = prepareMockOrchestratorKit(zone);
  const mockERTPOrchestrator = prepareERTPOrchestrator(zone);
  const { orchestrator, admin } = mockOrchestratorKit();
  const ertpOrchestrator = mockERTPOrchestrator(orchestrator, admin);

  const aChain = await orchestrator.getChain('a');
  t.truthy(aChain);
  const {
    brand: bucksBrand,
    issuer: bucksIssuer,
    mint: bucksMint,
    admin: _bucksAdmin,
  } = await ertpOrchestrator.provideIssuerKitForDenom('bucks', 'a');

  const bucks = value =>
    harden({
      brand: bucksBrand,
      value,
    });

  const aliceBucksPurse = await bucksIssuer.makeEmptyPurse();
  const bobBucksPurse = await bucksIssuer.makeEmptyPurse();

  const initBucksPayment = await bucksMint.mintPayment(bucks(300n));

  t.deepEqual(await aliceBucksPurse.getCurrentAmount(), bucks(0n));
  t.deepEqual(await bobBucksPurse.getCurrentAmount(), bucks(0n));
  t.deepEqual(await bucksIssuer.getAmountOf(initBucksPayment), bucks(300n));

  t.deepEqual(await aliceBucksPurse.deposit(initBucksPayment), bucks(300n));
  t.deepEqual(await aliceBucksPurse.getCurrentAmount(), bucks(300n));
  t.false(await bucksIssuer.isLive(initBucksPayment));
});
