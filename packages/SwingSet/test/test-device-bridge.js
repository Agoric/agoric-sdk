/* global harden */
import { test } from 'tape-promise/tape';
import '../install-ses.js';
import { initSwingStore } from '@agoric/swing-store-simple';

import { buildVatController, buildBridge } from '../src/index';

test('bridge device', async t => {
  const outboundLog = [];
  function outboundCallback(argv0, argv1) {
    outboundLog.push(argv0);
    outboundLog.push(argv1);
    return ['the', { retval: 'is' }, 4];
  }
  const bd = buildBridge(outboundCallback);

  const storage = initSwingStore();
  const config = {
    vats: new Map(),
    devices: [['bridge', bd.srcPath, bd.endowments]],
    bootstrapIndexJS: require.resolve('./device-bridge-bootstrap.js'),
    hostStorage: storage.storage,
  };

  const argv = [];
  argv[0] = { hello: 'from' };
  argv[1] = ['swingset'];
  const c = await buildVatController(config, true, argv);
  await c.run();

  t.deepEqual(outboundLog, argv);
  t.deepEqual(c.dump().log, [
    'outbound retval',
    JSON.stringify(['the', { retval: 'is' }, 4]),
    'false',
  ]);

  const inboundArg0 = ['hello'];
  const inboundArg1 = { from: 'host' };
  bd.deliverInbound(inboundArg0, inboundArg1);
  await c.run();

  t.deepEqual(c.dump().log, [
    'outbound retval',
    JSON.stringify(['the', { retval: 'is' }, 4]),
    'false',
    'inbound',
    JSON.stringify([inboundArg0, inboundArg1]),
  ]);

  // now reload it from a saved state, to make sure the inboundHandler is
  // still registered properly
  const outboundLog2 = [];
  function outboundCallback2(argv0, argv1) {
    outboundLog2.push(argv0);
    outboundLog2.push(argv1);
    return ['new', { retval: 'is' }, 5];
  }
  const bd2 = buildBridge(outboundCallback2);
  const config2 = {
    vats: new Map(),
    devices: [['bridge', bd2.srcPath, bd2.endowments]],
    bootstrapIndexJS: require.resolve('./device-bridge-bootstrap.js'),
    hostStorage: storage.storage,
  };

  const c2 = await buildVatController(config2, true, argv);
  await c2.run();
  // The bootstrap is reloaded from transcript, which means it doesn't run
  // any syscalls (they are switched off during replay), so it won't re-run
  // the bridge~.callOutbound, so outboundLog2 will be empty.
  t.deepEqual(outboundLog2, []);

  // But it *does* still call log(), which isn't a syscall, so we'll see the
  // 'outbound retval' from the previous run in the dump log.
  t.deepEqual(c2.dump().log, [
    'outbound retval',
    JSON.stringify(['the', { retval: 'is' }, 4]),
    'false',
    'inbound',
    JSON.stringify([inboundArg0, inboundArg1]),
  ]);

  // a new inbound message should be delivered normally
  const inboundArg2 = ['howdy'];
  const inboundArg3 = { from: 'second host' };
  bd2.deliverInbound(inboundArg2, inboundArg3);
  await c2.run();

  t.deepEqual(c2.dump().log, [
    'outbound retval',
    JSON.stringify(['the', { retval: 'is' }, 4]),
    'false',
    'inbound',
    JSON.stringify([inboundArg0, inboundArg1]),
    'inbound',
    JSON.stringify([inboundArg2, inboundArg3]),
  ]);

  t.end();
});

test('bridge device can return undefined', async t => {
  const outboundLog = [];
  function outboundCallback(argv0, argv1) {
    outboundLog.push(argv0);
    outboundLog.push(argv1);
    return undefined;
  }
  const bd = buildBridge(outboundCallback);

  const storage = initSwingStore();
  const config = {
    vats: new Map(),
    devices: [['bridge', bd.srcPath, bd.endowments]],
    bootstrapIndexJS: require.resolve('./device-bridge-bootstrap.js'),
    hostStorage: storage.storage,
  };

  const argv = [];
  argv[0] = { hello: 'from' };
  argv[1] = ['swingset'];
  const c = await buildVatController(config, true, argv);
  await c.run();

  t.deepEqual(outboundLog, argv);
  t.deepEqual(c.dump().log, ['outbound retval', '', 'true']);

  t.end();
});
