import test from 'ava';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const nodeRequire = createRequire(import.meta.url);

const asset = {
  script: nodeRequire.resolve('../../src/proposals/psm-gov-reset.js'),
  bundle: nodeRequire.resolve('../../bundles/bundle-psm.js'),
};

test('check bundleID between coreEval and psm.js upgrade', async t => {
  const script = await readFile(asset.script, 'utf-8');
  const found = script.match(/'b1-(?<hash>[^']+)'/);
  if (!found) throw t.fail('bundleID not found in script');
  const { hash } = found.groups || {};
  if (!hash) throw t.fail('hash not found in script');
  t.log('hash', hash);
  const bundle = await readFile(asset.bundle, 'utf-8');
  const actual = bundle.indexOf(hash);
  t.true(actual > 0, 'hash from script not found in bundle');
});
