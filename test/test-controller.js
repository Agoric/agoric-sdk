import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '../src/index';

test('load empty', async t => {
  const config = {
    vatSources: new Map(),
    bootstrapIndexJS: undefined,
  };
  const controller = await buildVatController(config);
  await controller.run();
  t.ok(true);
  t.end();
});

async function simpleCall(t, controller) {
  await controller.addVat('vat1', require.resolve('./vat-controller-1'));
  const data = controller.dump();
  t.deepEqual(data.vatTables, [{ vatID: 'vat1', state: { transcript: [] } }]);
  t.deepEqual(data.kernelTable, []);

  controller.queueToExport('vat1', 1, 'foo', 'args');
  t.deepEqual(controller.dump().runQueue, [
    {
      vatID: 'vat1',
      type: 'deliver',
      target: {
        type: 'export',
        vatID: 'vat1',
        id: 1,
      },
      msg: {
        method: 'foo',
        argsString: 'args',
        slots: [],
      },
    },
  ]);
  await controller.run();
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
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-controller-2'),
  );
  // the controller automatically runs the bootstrap function.
  // basedir-controller-2/bootstrap.js logs "bootstrap called" and queues a call to
  // left[0].bootstrap
  const c = await buildVatController(config, withSES);
  t.deepEqual(c.dump().log, ['bootstrap called']);
  t.end();
}

test('bootstrap with SES', async t => {
  await bootstrap(t, true);
});

test('bootstrap without SES', async t => {
  await bootstrap(t, false);
});

async function bootstrapExport(t, withSES) {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-controller-3'),
  );
  const c = await buildVatController(config, withSES);
  // console.log(c.dump());
  // console.log('SLOTS: ', c.dump().runQueue[0].slots);
  t.deepEqual(c.dump().kernelTable, []);

  t.deepEqual(c.dump().runQueue, [
    {
      vatID: '_bootstrap',
      type: 'deliver',
      target: { type: 'export', vatID: '_bootstrap', id: 0 },
      msg: {
        method: 'bootstrap',
        argsString:
          '{"args":[[],{"_bootstrap":{"@qclass":"slot","index":0},"left":{"@qclass":"slot","index":1},"right":{"@qclass":"slot","index":2}},{"_dummy":"dummy"}]}',
        slots: [
          { type: 'export', vatID: '_bootstrap', id: 0 },
          { type: 'export', vatID: 'left', id: 0 },
          { type: 'export', vatID: 'right', id: 0 },
        ],
      },
    },
  ]);

  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
  ]);
  // console.log('--- c.step() running bootstrap.obj0.bootstrap');
  await c.step();
  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
    'bootstrap.obj0.bootstrap()',
  ]);
  t.deepEqual(c.dump().kernelTable, [
    ['_bootstrap', 'import', 10, 'export', 'left', 0],
    ['_bootstrap', 'import', 11, 'export', 'right', 0],
    ['_bootstrap', 'promise', 20, 40],
  ]);
  t.deepEqual(c.dump().runQueue, [
    {
      vatID: 'left',
      type: 'deliver',
      target: {
        type: 'export',
        vatID: 'left',
        id: 0,
      },
      msg: {
        method: 'foo',
        argsString: '{"args":[1,{"@qclass":"slot","index":0}]}',
        slots: [{ type: 'export', vatID: 'right', id: 0 }],
        kernelResolverID: 40,
      },
    },
  ]);

  await c.step();
  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
  ]);
  t.deepEqual(c.dump().kernelTable, [
    ['_bootstrap', 'import', 10, 'export', 'left', 0],
    ['_bootstrap', 'import', 11, 'export', 'right', 0],
    ['_bootstrap', 'promise', 20, 40],
    ['left', 'import', 10, 'export', 'right', 0],
    ['left', 'promise', 20, 41],
    ['left', 'resolver', 30, 40],
  ]);
  t.deepEqual(c.dump().runQueue, [
    {
      vatID: 'right',
      type: 'deliver',
      target: {
        type: 'export',
        vatID: 'right',
        id: 0,
      },
      msg: {
        method: 'bar',
        argsString: '{"args":[2,{"@qclass":"slot","index":0}]}',
        slots: [{ type: 'export', vatID: 'right', id: 0 }],
        kernelResolverID: 41,
      },
    },
    { type: 'notifyFulfillToData', vatID: '_bootstrap', kernelPromiseID: 40 },
  ]);

  await c.step();

  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
    'right.obj0.bar 2 true',
  ]);

  t.deepEqual(c.dump().kernelTable, [
    ['_bootstrap', 'import', 10, 'export', 'left', 0],
    ['_bootstrap', 'import', 11, 'export', 'right', 0],
    ['_bootstrap', 'promise', 20, 40],
    ['left', 'import', 10, 'export', 'right', 0],
    ['left', 'promise', 20, 41],
    ['left', 'resolver', 30, 40],
    ['right', 'resolver', 30, 41],
  ]);
  t.deepEqual(c.dump().runQueue, [
    { type: 'notifyFulfillToData', vatID: '_bootstrap', kernelPromiseID: 40 },
    { type: 'notifyFulfillToData', vatID: 'left', kernelPromiseID: 41 },
  ]);

  await c.step();

  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
    'right.obj0.bar 2 true',
  ]);

  t.deepEqual(c.dump().kernelTable, [
    ['_bootstrap', 'import', 10, 'export', 'left', 0],
    ['_bootstrap', 'import', 11, 'export', 'right', 0],
    ['_bootstrap', 'promise', 20, 40],
    ['left', 'import', 10, 'export', 'right', 0],
    ['left', 'promise', 20, 41],
    ['left', 'resolver', 30, 40],
    ['right', 'resolver', 30, 41],
  ]);
  t.deepEqual(c.dump().runQueue, [
    { type: 'notifyFulfillToData', vatID: 'left', kernelPromiseID: 41 },
  ]);

  await c.step();

  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
    'right.obj0.bar 2 true',
  ]);

  t.deepEqual(c.dump().kernelTable, [
    ['_bootstrap', 'import', 10, 'export', 'left', 0],
    ['_bootstrap', 'import', 11, 'export', 'right', 0],
    ['_bootstrap', 'promise', 20, 40],
    ['left', 'import', 10, 'export', 'right', 0],
    ['left', 'promise', 20, 41],
    ['left', 'resolver', 30, 40],
    ['right', 'resolver', 30, 41],
  ]);
  t.deepEqual(c.dump().runQueue, []);

  t.end();
}

test('bootstrap export with SES', async t => {
  await bootstrapExport(t, true);
});

test('bootstrap export without SES', async t => {
  await bootstrapExport(t, false);
});
