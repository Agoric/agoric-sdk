import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '../src/index';
import { checkKT } from './util';

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

async function simpleCall(t, withSES) {
  const config = {
    vatSources: new Map([['vat1', require.resolve('./vat-controller-1')]]),
  };
  const controller = await buildVatController(config, withSES);
  const data = controller.dump();
  t.deepEqual(data.vatTables, [{ vatID: 'vat1', state: { transcript: [] } }]);
  t.deepEqual(data.kernelTable, []);

  controller.queueToExport('vat1', 'o+1', 'foo', 'args');
  t.deepEqual(controller.dump().runQueue, [
    {
      msg: {
        argsString: 'args',
        result: null,
        method: 'foo',
        slots: [],
      },
      target: 'ko20',
      type: 'deliver',
      vatID: 'vat1',
    },
  ]);
  await controller.run();
  t.deepEqual(JSON.parse(controller.dump().log[0]), {
    facetID: 'o+1',
    method: 'foo',
    argsString: 'args',
    slots: [],
  });

  controller.log('2');
  t.equal(controller.dump().log[1], '2');

  t.end();
}

test('simple call with SES', async t => {
  await simpleCall(t, true);
});

test('simple call non-SES', async t => {
  await simpleCall(t, false);
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

  // the expected kernel object indices
  const boot0 = 'ko20';
  const left0 = 'ko21';
  const right0 = 'ko22';
  const kt = [
    [boot0, '_bootstrap', 'o+0'],
    [left0, 'left', 'o+0'],
    [right0, 'right', 'o+0'],
  ];
  checkKT(t, c, kt);

  t.deepEqual(c.dump().runQueue, [
    {
      msg: {
        argsString:
          '{"args":[[],{"_bootstrap":{"@qclass":"slot","index":0},"left":{"@qclass":"slot","index":1},"right":{"@qclass":"slot","index":2}},{"_dummy":"dummy"}]}',
        result: null,
        method: 'bootstrap',
        slots: [boot0, left0, right0],
      },
      target: boot0,
      type: 'deliver',
      vatID: '_bootstrap',
    },
  ]);

  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
  ]);
  // console.log('--- c.step() running bootstrap.obj0.bootstrap');
  await c.step();
  // kernel promise for result of the foo() that bootstrap sends to vat-left
  const fooP = 'kp40';
  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
    'bootstrap.obj0.bootstrap()',
  ]);
  kt.push([left0, '_bootstrap', 'o-50']);
  kt.push([right0, '_bootstrap', 'o-51']);
  kt.push([fooP, '_bootstrap', 'p+5']);
  checkKT(t, c, kt);
  t.deepEqual(c.dump().runQueue, [
    {
      vatID: 'left',
      type: 'deliver',
      target: left0,
      msg: {
        method: 'foo',
        argsString: '{"args":[1,{"@qclass":"slot","index":0}]}',
        slots: [right0],
        result: fooP,
      },
    },
  ]);

  await c.step();
  const barP = 'kp41';
  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
  ]);
  kt.push([right0, 'left', 'o-50']);
  kt.push([fooP, 'left', 'p-60']);
  kt.push([barP, 'left', 'p+5']);
  checkKT(t, c, kt);

  t.deepEqual(c.dump().runQueue, [
    {
      vatID: 'right',
      type: 'deliver',
      target: right0,
      msg: {
        method: 'bar',
        argsString: '{"args":[2,{"@qclass":"slot","index":0}]}',
        slots: [right0],
        result: barP,
      },
    },
    { type: 'notifyFulfillToData', vatID: '_bootstrap', kernelPromiseID: fooP },
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

  kt.push([barP, 'right', 'p-60']);
  checkKT(t, c, kt);

  t.deepEqual(c.dump().runQueue, [
    { type: 'notifyFulfillToData', vatID: '_bootstrap', kernelPromiseID: fooP },
    { type: 'notifyFulfillToData', vatID: 'left', kernelPromiseID: barP },
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
  checkKT(t, c, kt);

  t.deepEqual(c.dump().runQueue, [
    { type: 'notifyFulfillToData', vatID: 'left', kernelPromiseID: barP },
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

  checkKT(t, c, kt);
  t.deepEqual(c.dump().runQueue, []);

  t.end();
}

test('bootstrap export with SES', async t => {
  await bootstrapExport(t, true);
});

test('bootstrap export without SES', async t => {
  await bootstrapExport(t, false);
});
