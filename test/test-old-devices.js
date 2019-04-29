import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController } from '../src/index';
import { buildSharedStringTable } from '../src/old-devices';

async function testSharedTable(t, withSES) {
  const srcIndex = path.resolve(__dirname, 'vat-devices-0.js');
  const c = await buildVatController({}, withSES);
  const tableDevice = buildSharedStringTable();
  const devices = {
    sharedTable: {
      attenuatorSource: tableDevice.attenuatorSource,
      table: tableDevice.table,
    },
  };
  // this calls setup(), which modifies the table synchronously
  await c.addVat('v1', srcIndex, { devices });
  t.deepEqual(tableDevice.table.get('loaded'), 'first');

  c.queueToExport('v1', 0, 'set', JSON.stringify({ args: ['key1', 'X'] }));
  t.equal(tableDevice.table.has('key1'), false);
  await c.step();
  t.deepEqual(c.dump().log, ['vat set key1=X']);
  t.equal(tableDevice.table.has('key1'), true);
  t.deepEqual(tableDevice.table.get('key1'), 'X');

  c.queueToExport('v1', 0, 'set', JSON.stringify({ args: ['key1', 'Y'] }));
  t.deepEqual(tableDevice.table.get('key1'), 'X');
  await c.step();
  t.deepEqual(tableDevice.table.get('key1'), 'Y');

  // give a second vat shared+synchronous access to the same table
  await c.addVat('v2', srcIndex, { devices });
  t.deepEqual(tableDevice.table.get('loaded'), 'first+');

  c.queueToExport('v2', 0, 'set', JSON.stringify({ args: ['key1', 'Z'] }));
  c.queueToExport('v1', 0, 'get', JSON.stringify({ args: ['key1'] }));
  await c.run();
  t.deepEqual(c.dump().log, [
    'vat set key1=X',
    'vat set key1=Y',
    'vat set key1=Z',
    'vat get key1=Z',
  ]);

  t.end();
}

test('sharedTable device with SES', async t => {
  await testSharedTable(t, true);
});

test('sharedTable device without SES', async t => {
  await testSharedTable(t, false);
});
