import test from 'ava';

import { q, Fail } from '@endo/errors';

import { BridgeId, VBankAccount } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';

import { makeHelpers } from '../tools/inquisitor.mjs';
import { makeCosmicSwingsetTestKit } from '../tools/test-kit.js';

test('smoke test', async t => {
  const fakeStorageKit = makeFakeStorageKit('');
  const { toStorage: handleVstorage } = fakeStorageKit;
  const receiveBridgeSend = (destPortName, msg) => {
    switch (destPortName) {
      case BridgeId.STORAGE: {
        return handleVstorage(msg);
      }
      case BridgeId.BANK: {
        if (msg.type === 'VBANK_GET_MODULE_ACCOUNT_ADDRESS') {
          const matchesRequest = desc => desc.module === msg.moduleName;
          const found = Object.values(VBankAccount).find(matchesRequest);
          if (found) return found.address;
          return { error: `module account ${msg.moduleName} not found` };
        }
        break;
      }
      default:
        break;
    }
    Fail`port ${q(destPortName)} not implemented for message ${msg}`;
  };
  const env = {
    ...process.env,
    CHAIN_BOOTSTRAP_VAT_CONFIG: '@agoric/vm-config/decentral-core-config.json',
  };
  const testKit = await makeCosmicSwingsetTestKit(receiveBridgeSend, { env });
  const { pushCoreEval, runNextBlock, swingStore, shutdown } = testKit;
  t.teardown(shutdown);

  // To tickle some activity, run a couple of trivial blocks.
  pushCoreEval(`${() => {}}`);
  await runNextBlock();
  pushCoreEval(`${() => {}}`);
  await runNextBlock();

  // Build and exercise the helpers.
  const { db } = swingStore.internal;
  // @ts-expect-error missing EV
  const { stable: helpers } = makeHelpers({ db });
  t.truthy(helpers.kvGet('vat.names'));
  t.true(Array.isArray(helpers.kvGetJSON('vat.dynamicIDs')));
  /** @type {any} */
  const vatAdmin = helpers.vatsByName.get('vatAdmin');
  t.like(vatAdmin, { name: 'vatAdmin', isStatic: true }, 'vatAdmin');
  {
    const { vatID } = vatAdmin;
    t.regex(vatID, /^v[1-9][0-9]*$/, 'vatAdmin vatID');

    const rootVref = 'o+0';
    const rootRefs = helpers.getRefs(rootVref, vatID);
    t.true(rootRefs.length > 0, 'vatAdmin root object export');

    const rootKref = rootRefs[0].kref;
    const rootRefsByKref = helpers.getRefs(rootKref);
    t.deepEqual(rootRefsByKref, rootRefs, 'vatAdmin root object kref');

    /** @type {any} */
    const clist = helpers.kvGlob(`${vatID}.c.*`);
    t.true(clist.length > 0);
    const rootRow = clist.find(row => row.value === rootKref);
    t.like(
      rootRow,
      { key: `${vatID}.c.${rootVref}`, value: rootKref },
      'kvGlob',
    );
  }
});
