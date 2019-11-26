// eslint-disable-next-line no-redeclare
/* global process */
import semver from 'semver';
import { test } from 'tape-promise/tape';

test('Node version', t => {
  t.true(
    semver.satisfies(process.version, '>=11.0'),
    'we need Node 11 where the IO queue is higher priority than the Promise queue',
  );
  t.end();
});
