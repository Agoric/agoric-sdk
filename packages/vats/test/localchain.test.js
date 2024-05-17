import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';
import { E } from '@endo/far';
import { M, matches } from '@endo/patterns';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { buildRootObject } from '../src/vat-bank.js';
import { prepareLocalChainTools } from '../src/localchain.js';

/** @type {import('ava').TestFn<ReturnType<makeTestContext>>} */
const test = anyTest;

const makeTestContext = async t => {
  const { fakeVomKit } = reincarnate({ relaxDurabilityRules: false });
  const provideBaggage = key => {
    const root = fakeVomKit.cm.provideBaggage();
    const zone = makeDurableZone(root);
    return zone.mapStore(`${key} baggage`);
  };
  const baggage = provideBaggage('localchainTest');
  const bankVat = E(buildRootObject)(null, null, baggage);

  const zone = makeDurableZone(baggage);

  /** @type {undefined | ERef<import('../src/types.js').BridgeHandler>} */
  let bankHandler;

  /** @type {import('../src/types.js').ScopedBridgeManager} */
  const fakeBridgeManager = zone.exo('fakeBankBridgeManager', undefined, {
    async fromBridge(obj) {
      t.is(typeof obj, 'string');
    },
    async toBridge(obj) {
      let ret;
      switch (obj.type) {
        case 'VLOCALCHAIN_ALLOCATE_ADDRESS': {
          ret = 'agoricfoo';
          break;
        }
        default: {
          t.is(obj, null);
        }
      }
      return ret;
    },
    initHandler(newHandler) {
      bankHandler = newHandler;
    },
    setHandler(newHandler) {
      bankHandler = newHandler;
    },
  });
  const bankManager = await E(bankVat).makeBankManager(fakeBridgeManager);

  const { makeLocalChain } = prepareLocalChainTools(zone.subZone('localchain'));

  const powers = {
    system: fakeBridgeManager,
    bankManager,
  };
  const localchain = makeLocalChain(powers);

  return {
    baggage,
    zone,
    bankHandler,
    fakeBridgeManager,
    bankVat,
    bankManager,
    localchain,
  };
};

test.beforeEach(t => {
  t.context = makeTestContext(t);
});

test('localchain - deposit and withdraw', async t => {
  const { localchain } = await t.context;

  const lca = await E(localchain).makeAccount();
  t.true(matches(lca, M.remotable('LocalChainAccount')));

  const address = await E(lca).getAddress();
  t.is(address, 'agoricfoo');
});
