/**
 * @file
 *  cribbed from packages/zoe/test/swingsetTests/upgradeCoveredCall/test-coveredCall-service-upgrade.js
 */
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { buildVatController } from '@agoric/swingset-vat';

/** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */
const test = anyTest;

/**
 * WARNING: uses ambient authority
 * of import.meta.url
 *
 * We aim to use ambient authority only in test.before();
 * splitting out makeTestContext() lets us type t.context.
 */
const makeTestContext = async () => {
  const bfile = name => new URL(name, import.meta.url).pathname;
  const importSpec = spec =>
    importMetaResolve(spec, import.meta.url).then(u => new URL(u).pathname);
  return { bfile, importSpec };
};

test.before(async t => {
  t.context = await makeTestContext();
});

test('upgrade mintHolder', async t => {
  const { bfile, importSpec } = t.context;

  /** @type {SwingSetConfig} */
  const config = harden({
    defaultManagerType: 'xs-worker',
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: { sourceSpec: bfile('./bootstrap.js') },
      zoe: { sourceSpec: bfile('../../src/vat-zoe.js') },
      ertp: { sourceSpec: bfile('./vat-ertp-service.js') },
    },
    bundles: {
      zcf: {
        sourceSpec: await importSpec('@agoric/zoe/contractFacet.js'),
      },
      mintHolder: { sourceSpec: bfile('../../src/mintHolder.js') },
    },
  });
  // console.debug('config', JSON.stringify(config, null, 2));

  const c = await buildVatController(config);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (name, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', name, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const capdata = c.kpResolution(kpid);
    return [status, capdata];
  };

  // create initial version
  const [v1status] = await run('buildV1', []);
  t.is(v1status, 'fulfilled');

  // now perform the upgrade
  t.log(`-- starting upgradeV2`);

  const [v2status] = await run('upgradeV1', []);

  t.is(v2status, 'fulfilled');
});
