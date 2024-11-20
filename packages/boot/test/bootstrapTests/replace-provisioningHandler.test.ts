/**
 * @file The goal here is to showcase bootstrap vat exports a durable provisioningHandler
 * object after replacing it. Related issues are #10425, #8849.
 *
 * Test "audit bootstrap exports" is copied from vaults-upgrade.test.js but tweaked to
 * trigger a GC sweep and specifically check for the iface "provisioningHandler" belongs
 * to a durable object.
 */

import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { Far, makeMarshal } from '@endo/marshal';
import {
  makeLiquidationTestContext,
  type LiquidationTestContext,
} from '../../tools/liquidation.js';

const test = anyTest as TestFn<LiquidationTestContext>;

test.before(async t => {
  const context = await makeLiquidationTestContext(t);

  t.context = {
    ...context,
  };
});

test.serial('run replace-provisioningHandler core eval', async t => {
  const { buildProposal, evalProposal } = t.context;
  const proposal = await buildProposal(
    '@agoric/builders/scripts/vats/replace-provisioningHandler.js',
  );

  await evalProposal(proposal);
  t.pass();
});

test.serial('audit bootstrap exports', async t => {
  const expected = {
    maxExports: 5,
    maxNonDurable: 4,
    ifaces: {
      durable: {
        // in bridgeProvisioner()
        provisioningHandler: true,
      },
      nonDurable: {
        // in bridgeCoreEval()
        coreHandler: true,
        'prioritySenders manager': true,
        // TODO? move to provisioning vat?
        clientCreator: true,
      },
    },
  };

  const { controller } = t.context;

  // Schedule a GC run and wait until it completes before dumping the state
  controller.reapAllVats();
  await controller.run();

  const kState = controller.dump();

  const myVatID = 'v1';

  const myPromises = kState.promises.filter(
    // @ts-expect-error kernel.dump() .promises type is wrong
    p => p.decider === myVatID,
  );
  t.true(myPromises.length <= 1, 'bootstrap is the decider of only its return');

  const myExports = kState.kernelTable.filter(
    o => o[1] === myVatID && o[2].startsWith('o+'),
  );
  const v1VatTable =
    kState.vatTables.find(vt => vt.vatID === myVatID) || assert.fail();
  const { transcript } = v1VatTable.state;

  const oids = new Set(myExports.map(o => o[2]));
  const oidsDurable = [...oids].filter(o => o.startsWith('o+d'));
  t.log(
    'bootstrap exports:',
    oidsDurable.length,
    'durable',
    oids.size - oidsDurable.length,
    'non-durable',
    oids.size,
    'total',
  );
  t.true(oids.size <= expected.maxExports, 'too many exports');
  t.true(
    oids.size - oidsDurable.length <= expected.maxNonDurable,
    'too many non-durable',
  );

  // Map oid to iface by poring over transcript syscalls
  const toIface = new Map();
  const anObj = Far('obj', {});
  const aPromise = harden(new Promise(() => {}));
  const saveBootstrapIface = (slot, iface) => {
    if (slot.startsWith('p')) return aPromise;
    if (oids.has(slot)) {
      toIface.set(slot, iface);
    }
    return anObj;
  };
  const m = makeMarshal(undefined, saveBootstrapIface);
  for (const oid of oids) {
    for (const [_ix, ev] of transcript) {
      for (const sc of ev.sc) {
        if (sc.s[0] === 'send') {
          const { methargs } = sc.s[2];
          if (!methargs.slots.includes(oid)) continue;
          m.fromCapData(methargs);
          break;
        } else if (sc.s[0] === 'resolve') {
          for (const res of sc.s[1]) {
            const capdata = res[2];
            if (!capdata.slots.includes(oid)) continue;
            m.fromCapData(capdata);
            break;
          }
        }
      }
    }
  }

  for (const [key, value] of toIface.entries()) {
    t.log('IFACE_VAL', key, value);
  }

  const exportedInterfacesNonDurable = Object.fromEntries(
    [...toIface.entries()]
      .filter(([slot, _]) => !slot.startsWith('o+d'))
      .map(([_, iface]) => [iface.replace(/^Alleged: /, ''), true]),
  );

  const exportedInterfacesDurable = Object.fromEntries(
    [...toIface.entries()]
      .filter(([slot, _]) => slot.startsWith('o+d'))
      .map(([_, iface]) => [iface.replace(/^Alleged: /, ''), true]),
  );

  t.deepEqual(
    exportedInterfacesNonDurable,
    expected.ifaces.nonDurable,
    'expected non-durable interfaces',
  );
  t.deepEqual(
    exportedInterfacesDurable,
    expected.ifaces.durable,
    'expected durable interfaces',
  );
  t.true(
    oids.size - oidsDurable.length <= expected.maxNonDurable,
    'too many non-durable',
  );
});
