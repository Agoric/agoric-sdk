/* global __dirname */
import { test } from '../../tools/prepare-test-env-ava';

// eslint-disable-next-line import/order
import path from 'path';
import { buildVatController } from '../../src/index';
import makeNextLog from '../make-nextlog';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

function slot0(iface, kid) {
  return {
    body: `{"@qclass":"slot","iface":"Alleged: ${iface}","index":0}`,
    slots: [kid],
  };
}

test('virtual object representatives', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: path.resolve(__dirname, 'vat-representative-bootstrap.js'),
        creationOptions: {
          virtualObjectCacheSize: 3,
        },
      },
    },
  };

  const c = await buildVatController(config);
  const nextLog = makeNextLog(c);

  await c.run();
  t.deepEqual(c.kpResolution(c.bootstrapResult), capargs('bootstrap done'));

  async function doTestA(mode, result) {
    const r = c.queueToVatExport(
      'bootstrap',
      'o+0',
      'testA',
      capargs([`thing${mode}`, mode]),
    );
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    t.deepEqual(nextLog(), []);
    t.deepEqual(c.kpResolution(r), slot0('thing', result));
  }
  await doTestA(1, 'ko25');
  await doTestA(2, 'ko26');

  async function doTestB(mode, result) {
    const r = c.queueToVatExport(
      'bootstrap',
      'o+0',
      'testB',
      capargs([`thing${mode}`, mode]),
    );
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    t.deepEqual(nextLog(), [
      `test${mode} thing.name before rename "thing${mode}"`,
      `test${mode} initialSelf.name before rename "thing${mode}"`,
      `test${mode} thing.name after rename "thing${mode} modified"`,
      `test${mode} initialSelf.name after rename "thing${mode} modified"`,
    ]);
    t.deepEqual(c.kpResolution(r), slot0('thing', result));
  }
  await doTestB(3, 'ko27');
  await doTestB(4, 'ko28');
  await doTestB(5, 'ko29');
  await doTestB(6, 'ko30');

  async function doTestC(mode) {
    const r = c.queueToVatExport(
      'bootstrap',
      'o+0',
      'testC',
      capargs([`thing${mode}`, mode]),
    );
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    t.deepEqual(nextLog(), [`test${mode} result is "47"`]);
  }
  await doTestC(7);
  await doTestC(8);
  await doTestC(9);
  await doTestC(10);

  async function doTestD(mode) {
    const r = c.queueToVatExport(
      'bootstrap',
      'o+0',
      'testD',
      capargs([`thing${mode}`, mode]),
    );
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    t.deepEqual(nextLog(), [`test${mode} result is "thing${mode}"`]);
  }
  await doTestD(11);
  await doTestD(12);

  async function doTestE(mode) {
    const r = c.queueToVatExport(
      'bootstrap',
      'o+0',
      'testE',
      capargs([`thing${mode}`, mode]),
    );
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    t.deepEqual(nextLog(), [`test${mode} result is "thing${mode} modified"`]);
  }
  await doTestE(13);
  await doTestE(14);
  await doTestE(15);
  await doTestE(16);
  await doTestE(17);
  await doTestE(18);
  await doTestE(19);
  await doTestE(20);

  const rz1 = c.queueToVatExport(
    'bootstrap',
    'o+0',
    'testCacheOverflow',
    capargs([`zot1`, false]),
  );
  await c.run();
  t.is(c.kpStatus(rz1), 'fulfilled');
  t.deepEqual(nextLog(), []);
  t.deepEqual(c.kpResolution(rz1), slot0('zot', 'ko31'));

  const rz2 = c.queueToVatExport(
    'bootstrap',
    'o+0',
    'testCacheOverflow',
    capargs([`zot2`, true]),
  );
  await c.run();
  t.is(c.kpStatus(rz2), 'fulfilled');
  t.deepEqual(nextLog(), [
    'testCacheOverflow catches Error: cache overflowed with objects being initialized',
  ]);
  t.deepEqual(c.kpResolution(rz2), capdata('"overflow"'));
});
