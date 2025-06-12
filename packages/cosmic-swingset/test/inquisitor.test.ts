import anyTest, { type TestFn } from 'ava';

import { makeHelpers } from '../tools/inquisitor.mjs';
import { makeCosmicSwingsetTestKit } from '../tools/test-kit.js';

const test = anyTest as TestFn;

test('smoke test', async t => {
  const env = {
    ...process.env,
    CHAIN_BOOTSTRAP_VAT_CONFIG: '@agoric/vm-config/decentral-core-config.json',
  };
  const testKit = await makeCosmicSwingsetTestKit({
    env,
  });
  const { EV, pushCoreEval, swingStore, shutdown } = testKit;
  t.teardown(shutdown);

  // To tickle some activity, run a couple of trivial blocks.
  await pushCoreEval(`${() => {}}`);
  await pushCoreEval(`${() => {}}`);

  // Build and exercise the helpers.
  const { db } = swingStore.internal;
  const { stable: helpers } = makeHelpers({ db, EV });
  t.truthy(helpers.kvGet('vat.names'));
  t.true(Array.isArray(helpers.kvGetJSON('vat.dynamicIDs')));
  const vatAdmin: any = helpers.vatsByName.get('vatAdmin');
  t.like(vatAdmin, { name: 'vatAdmin', isStatic: true }, 'vatAdmin');
  const { vatID } = vatAdmin;
  t.regex(vatID, /^v[1-9][0-9]*$/, 'vatAdmin vatID');

  const rootVref = 'o+0';
  const rootRefs = helpers.getRefs(rootVref, vatID);
  t.true(rootRefs.length > 0, 'vatAdmin root object export');

  const rootKref = rootRefs[0].kref;
  const rootRefsByKref = helpers.getRefs(rootKref);
  t.deepEqual(rootRefsByKref, rootRefs, 'vatAdmin root object kref');

  const clist: any = helpers.kvGlob(`${vatID}.c.*`);
  t.true(clist.length > 0);
  const rootRow = clist.find(row => row.value === rootKref);
  t.like(rootRow, { key: `${vatID}.c.${rootVref}`, value: rootKref }, 'kvGlob');
});
