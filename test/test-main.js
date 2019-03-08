import { test } from 'tape-promise/tape';
import { buildVatController } from '../src/index';

test('load', async t => {
  const config = {
    vatSources: {},
    wiringSource: '',
  };
  const controller = await buildVatController(config);
  controller.run();
  t.end();
});

test('simple call', async t => {
  const controller = await buildVatController({});
  function d1(_syscall, _facetID, _method, _argsString, _slots) {
    // log.push([facetID, method, argsString, slots]);
  }
  controller.addVat('vat1', `(${d1})`);
  const data = controller.dump();
  t.deepEqual(data.vatTables, [{ vatID: 'vat1' }]);
  t.deepEqual(data.kernelTable, []);

  controller.queue('vat1', 1, 'foo', 'args');
  t.deepEqual(controller.dump().runQueue, [
    { vatID: 'vat1', facetID: 1, method: 'foo', argsString: 'args', slots: [] },
  ]);
  controller.run();

  t.end();
});
