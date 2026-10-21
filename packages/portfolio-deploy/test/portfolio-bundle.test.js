import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const bundlePath = fileURLToPath(
  new URL('../dist/portfolio.contract.bundle.js', import.meta.url),
);

test('built bundle does not use the Array.from({length}) pattern our pinned XS mis-enumerates', t => {
  const bundle = fs.readFileSync(bundlePath, 'utf8');
  // See packages/xsnap/test/xs-js.test.js: for...in/Object.keys/
  // getOwnPropertyNames on an array built via Array.from({length}[, mapFn])
  // report index "0" `length` times under XS, never "1"..`length - 1`.
  // This regexp is deliberately loose (no mapFn/parens requirement) to
  // catch the pattern regardless of formatting or minification.
  t.notRegex(bundle, /Array\.from\(\{/);
});
