import { test } from 'tape-promise/tape';
import { buildVatController } from '../src/index';

test('load', async t => {
  const config = {
    vatSources: new Map(),
    bootstrapIndexJS: undefined,
  };
  const controller = await buildVatController(config);
  controller.run();
  t.end();
});

test('simple call with SES', async t => {
  const controller = await buildVatController({});
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
});

test('simple call non-SES', async t => {
  const controller = await buildVatController({}, false);
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
});
