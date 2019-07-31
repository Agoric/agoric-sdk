/* global process */
import semver from 'semver';
import { test } from 'tape-promise/tape';

test('Node version', t => {
  t.true(
    semver.satisfies(process.version, '>=12.0'),
    'we need Node 11 where the IO queue is higher priority than the Promise queue, and Node 12 for a different ordering issue (see #99 for details)',
  );
  t.end();
});
