import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '../src/index';

test('load empty', async t => {
  const config = {
    vatSources: new Map(),
    bootstrapIndexJS: undefined,
  };
  const controller = await buildVatController(config);
  controller.run();
  t.end();
});

async function simpleCall(t, controller) {
  await controller.addVat('vat1', require.resolve('./d1'));
  const data = controller.dump();
  t.deepEqual(data.vatTables, [{ vatID: 'vat1' }]);
  t.deepEqual(data.kernelTable, []);

  controller.queue('vat1', 1, 'foo', 'args');
  t.deepEqual(controller.dump().runQueue, [
    { vatID: 'vat1', facetID: 1, method: 'foo', argsString: 'args', slots: [] },
  ]);
  controller.run();
  t.deepEqual(JSON.parse(controller.dump().log[0]), {
    facetID: 1,
    method: 'foo',
    argsString: 'args',
    slots: [],
  });

  controller.log('2');
  t.equal(controller.dump().log[1], '2');

  t.end();
}

test('simple call with SES', async t => {
  const controller = await buildVatController({});
  await simpleCall(t, controller);
});

test('simple call non-SES', async t => {
  const controller = await buildVatController({}, false);
  await simpleCall(t, controller);
});

test('reject module-like sourceIndex', async t => {
  const vatSources = new Map();
  // the keys of vatSources are vat source index strings: something that
  // require() or rollup can use to import/stringify the source graph that
  // should be loaded into the vat. We want this to be somewhere on local
  // disk, so it should start with '/' or '.'. If it doesn't, the name will
  // be treated as something to load from node_modules/ (i.e. something
  // installed from npm), so we want to reject that.
  vatSources.set('vat1', 'vatsource');
  t.rejects(
    async () => buildVatController({ vatSources }, false),
    /sourceIndex must be relative/,
  );
  t.end();
});

async function bootstrap(t, withSES) {
  const config = await loadBasedir(path.resolve(__dirname, 'd2'));
  // the controller automatically runs the bootstrap function.
  // d2/bootstrap.js logs "bootstrap called" and queues a call to
  // left[0].bootstrap
  const c = await buildVatController(config, withSES);
  t.deepEqual(c.dump().log, ['bootstrap called']);
  t.deepEqual(c.dump().kernelTable, [['left', -1, 'right', 5]]);

  c.run();
  t.deepEqual(c.dump().log, [
    'bootstrap called',
    'left dispatch(0, bootstrap, {}, )',
    'right dispatch(5, hello, [2,3], -1)',
  ]);
  t.deepEqual(c.dump().kernelTable, [
    ['left', -1, 'right', 5],
    ['right', -1, 'left', 4],
  ]);

  t.end();
}

test('bootstrap with SES', async t => {
  await bootstrap(t, true);
});

test('bootstrap without SES', async t => {
  await bootstrap(t, false);
});

async function bootstrapExport(t, withSES) {
  const config = await loadBasedir(path.resolve(__dirname, 'd3'));
  const c = await buildVatController(config, withSES);
  t.deepEqual(c.dump().log, ['bootstrap called', 'left.start called']);
  t.deepEqual(c.dump().kernelTable, [['left', -1, 'right', 5]]);

  // console.log(JSON.stringify(c.dump(), undefined, 1));

  c.run();
  t.deepEqual(c.dump().log, [
    'bootstrap called',
    'left.start called',
    'left.foo arg1val',
    'left.callRight',
    'right.dispatch(5, bar, ["arg2"], )',
  ]);

  t.end();
}

test.skip('bootstrap export with SES', async t => {
  await bootstrapExport(t, true);
});

test.skip('bootstrap export without SES', async t => {
  await bootstrapExport(t, false);
});
