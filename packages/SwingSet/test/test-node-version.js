// eslint-disable-next-line no-redeclare
/* global process */
import { test } from '../tools/prepare-test-env-ava';

// eslint-disable-next-line import/order
import semver from 'semver';

test('Node version for IO queue priority', t => {
  t.true(
    semver.satisfies(process.version, '>=11.0'),
    'we need Node 11 where the IO queue is higher priority than the Promise queue',
  );
});

test('Node version', t => {
  t.true(
    semver.satisfies(process.version, '>=12.14.1'),
    'we only test against Node 12.14.1 (LTS)',
  );
});
