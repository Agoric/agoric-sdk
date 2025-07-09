// @ts-check
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareBridgeTargetModule } from '../src/bridge-target.js';

import { makeFakeTransferBridge } from '../tools/fake-bridge.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const { fakeVomKit } = reincarnate({ relaxDurabilityRules: false });
const provideBaggage = key => {
  const root = fakeVomKit.cm.provideBaggage();
  const zone = makeDurableZone(root);
  return zone.mapStore(`${key} baggage`);
};

const makeTestContext = async _t => {
  const zone = makeDurableZone(provideBaggage('bridge'));
  const { makeBridgeTargetKit } = prepareBridgeTargetModule(zone);

  return {
    zone,
    makeBridgeTargetKit,
  };
};

test.beforeEach(async t => {
  t.context = await makeTestContext(t);
});

test('proper upcalls', async t => {
  const { zone, makeBridgeTargetKit } = t.context;

  const bridgeTraffic = [];
  const manager = makeFakeTransferBridge(zone.subZone('bridge'), obj =>
    bridgeTraffic.push(obj),
  );
  const { bridgeHandler, targetRegistry } = makeBridgeTargetKit(
    manager,
    'INBOUND_EVENT',
  );

  const properUpcalls = [];
  await targetRegistry.register(
    'a-proper-registration',
    zone.exo('Tap', undefined, {
      async receiveUpcall(obj) {
        properUpcalls.push(obj);
      },
    }),
  );

  /**
   * @param {number} num
   * @param {any} target
   */
  const mkMsg = (num, target = 'a-proper-registration') =>
    harden({
      type: 'INBOUND_EVENT',
      target,
      upcall: { num },
    });
  await bridgeHandler.fromBridge(mkMsg(1));

  await t.throwsAsync(
    async () => bridgeHandler.fromBridge(mkMsg(2, 'not-known')),
    {
      message: /key "not-known" not found in collection "targetToApp"/,
    },
  );

  await bridgeHandler.fromBridge(mkMsg(3));

  await bridgeHandler.fromBridge(
    mkMsg(4, { onlyIfRegistered: 'a-proper-registration' }),
  );

  await bridgeHandler.fromBridge(mkMsg(5, { onlyIfRegistered: 'not-known' }));

  t.snapshot(properUpcalls, 'proper upcalls');
  t.snapshot(bridgeTraffic, 'bridge traffic');
});
