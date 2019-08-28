import { test } from 'tape-promise/tape';
import { buildVatController, getVatTPSourcePath } from '../src/index';
import { buildMailboxStateMap, buildMailbox } from '../src/devices/mailbox';

async function testVatTP(t, withSES) {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  const config = {
    vatSources: new Map(),
    devices: [['mailbox', mb.srcPath, mb.endowments]],
    bootstrapIndexJS: require.resolve('./files-vattp/bootstrap-test-vattp'),
  };
  config.vatSources.set('vattp', getVatTPSourcePath());

  const c = await buildVatController(config, withSES, ['1']);
  await c.run();
  t.deepEqual(s.exportToData(), {});

  t.equal(mb.deliverInbound('remote1', [[1, 'msg1'], [2, 'msg2']], 0), true);
  await c.run();
  t.deepEqual(c.dump().log, [
    'not sending anything',
    'ch.receive msg1',
    'ch.receive msg2',
  ]);
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 2 } });

  t.equal(mb.deliverInbound('remote1', [[1, 'msg1'], [2, 'msg2']], 0), false);
  await c.run();
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 2 } });

  t.end();
}

test('vattp without SES', async t => {
  await testVatTP(t, false);
});

test('vattp with SES', async t => {
  await testVatTP(t, true);
});

async function testVatTP2(t, withSES) {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  const config = {
    vatSources: new Map(),
    devices: [['mailbox', mb.srcPath, mb.endowments]],
    bootstrapIndexJS: require.resolve('./files-vattp/bootstrap-test-vattp'),
  };
  config.vatSources.set('vattp', getVatTPSourcePath());

  const c = await buildVatController(config, withSES, ['2']);
  await c.run();
  t.deepEqual(s.exportToData(), {
    remote1: { outbox: [[1, 'out1']], inboundAck: 0 },
  });

  t.equal(mb.deliverInbound('remote1', [], 1), true);
  await c.run();
  t.deepEqual(c.dump().log, []);
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 0 } });

  t.equal(mb.deliverInbound('remote1', [[1, 'msg1']], 1), true);
  await c.run();
  t.deepEqual(c.dump().log, ['ch.receive msg1']);
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 1 } });

  t.equal(mb.deliverInbound('remote1', [[1, 'msg1']], 1), false);

  t.equal(mb.deliverInbound('remote1', [[1, 'msg1'], [2, 'msg2']], 1), true);
  await c.run();
  t.deepEqual(c.dump().log, ['ch.receive msg1', 'ch.receive msg2']);
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 2 } });

  t.end();
}

test('vattp 2 without SES', async t => {
  await testVatTP2(t, false);
});

test('vattp 2 with SES', async t => {
  await testVatTP2(t, true);
});
