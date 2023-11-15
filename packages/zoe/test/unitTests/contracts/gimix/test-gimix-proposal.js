// @ts-check
import test from 'ava';
import fsp from 'fs/promises';
import { fileURLToPath } from 'url';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';

import { permit } from '../../../../src/contracts/gimix/start-gimix.js';

const asset = ref => fileURLToPath(new URL(ref, import.meta.url));

const noImport = txt =>
  txt.replace(/^\s*import\b\s*(.*)/gm, '// REDACTED: $1\n');
const noExport = txt => txt.replace(/^\s*export\b\s*/gm, '');
const defang = txt => txt.replace(/\bimport\b/g, 'XMPORT');

test('gimix', async t => {
  const { env } = process;
  const bundleCache = await unsafeMakeBundleCache('bundles/');

  t.notThrows(() => JSON.parse(permit));

  const bundle = await bundleCache.load(
    asset('../../../../src/contracts/gimix/gimix.js'),
    'gimix',
  );

  const modText = await fsp.readFile(
    asset('../../../../src/contracts/gimix/start-gimix.js'),
    'utf-8',
  );

  let script = defang(noExport(noImport(modText)));

  script = script.replace(
    /bundleID = fail.*/,
    `bundleID = ${JSON.stringify(`b1-${bundle.endoZipBase64Sha512}`)},`,
  );

  if (env.ORACLE_ADDRESS) {
    script = script.replace(
      /oracleAddress = fail.*/,
      `oracleAddress = ${JSON.stringify(env.ORACLE_ADDRESS)},`,
    );
  }
  const c = new Compartment({ E: () => {}, Far: () => {} });
  t.notThrows(() => c.evaluate(script));

  if (env.PERMIT) {
    const pretty = JSON.stringify(JSON.parse(permit), null, 2);
    t.log('write permit to', env.PERMIT);
    await t.notThrowsAsync(fsp.writeFile(env.PERMIT, pretty));
  }
  if (env.SCRIPT) {
    t.log('write script to', env.SCRIPT);
    await t.notThrowsAsync(fsp.writeFile(env.SCRIPT, script));
  }
});
