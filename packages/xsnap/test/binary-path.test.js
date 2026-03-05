import test from 'ava';

import {
  mapOsArchToTarget,
  targetToBuildPlatform,
} from '../src/install-prebuilt.js';
import { resolveXsnapWorkerPath } from '../src/xsnap.js';

test('resolveXsnapWorkerPath uses default release path', t => {
  const path = resolveXsnapWorkerPath({
    os: 'Linux',
    debug: false,
    env: {},
  });

  t.regex(
    path,
    /\/xsnap-native\/xsnap\/build\/bin\/lin\/release\/xsnap-worker$/,
  );
});

test('resolveXsnapWorkerPath uses default debug path', t => {
  const path = resolveXsnapWorkerPath({
    os: 'Darwin',
    debug: true,
    env: {},
  });

  t.regex(path, /\/xsnap-native\/xsnap\/build\/bin\/mac\/debug\/xsnap-worker$/);
});

test('resolveXsnapWorkerPath uses XSNAP_WORKER override', t => {
  const path = resolveXsnapWorkerPath({
    os: 'Linux',
    debug: false,
    env: { XSNAP_WORKER: '/tmp/custom-xsnap-worker' },
  });

  t.is(path, '/tmp/custom-xsnap-worker');
});

test('resolveXsnapWorkerPath uses debug override first', t => {
  const path = resolveXsnapWorkerPath({
    os: 'Linux',
    debug: true,
    env: {
      XSNAP_WORKER: '/tmp/release-worker',
      XSNAP_WORKER_DEBUG: '/tmp/debug-worker',
    },
  });

  t.is(path, '/tmp/debug-worker');
});

test('resolveXsnapWorkerPath rejects unsupported platform', t => {
  const err = t.throws(() =>
    resolveXsnapWorkerPath({
      os: 'Windows_NT',
      debug: false,
      env: {},
    }),
  );

  t.regex(err.message, /does not support platform/);
});

test('mapOsArchToTarget maps supported host tuple', t => {
  t.is(mapOsArchToTarget('Linux', 'x64'), 'linux-x64');
  t.is(mapOsArchToTarget('Darwin', 'arm64'), 'darwin-arm64');
});

test('targetToBuildPlatform maps target to moddable platform', t => {
  t.is(targetToBuildPlatform('linux-arm64'), 'lin');
  t.is(targetToBuildPlatform('darwin-x64'), 'mac');
});
