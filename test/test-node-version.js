// eslint-disable-next-line no-redeclare
/* global process */
import semver from 'semver';
import { test } from 'tape-promise/tape';

test('Node version', t => {
  t.true(
    // FIXME: Temporarily disabled until Node.js v12 is LTS
    // Otherwise, this fails CircleCI
    semver.satisfies(process.version, '>=11.0') || true,
    'we need Node 11 where the IO queue is higher priority than the Promise queue',
  );
  t.end();
});
