import semver from 'semver';
import { test } from 'tape-promise/tape';

test('Node version', t => {
  t.true(semver.satisfies(process.version, '>=10.15.1'));
  t.end();
});
