import semver from 'semver';
import { test } from 'tape-promise/tape';

test('Node version', t => {
  t.true(
    semver.satisfies(process.version, '>=11.11.0'),
    'we need the IO queue to be higher priority than the Promise queue',
  );
  t.end();
});
