// @ts-check
import test from 'ava';
import fsp from 'fs/promises';
import { fileURLToPath } from 'url';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';

import { permit } from '../../../../src/contracts/gimix/start-gimix.js';

const asset = ref => fileURLToPath(new URL(ref, import.meta.url));

/**
 * If $SCRIPT is set, the test(s) below will write
 * the rendered script to a file by that name.
 * Likeiwse $PERMIT.
 *
 * If $ORACLE_ADDRESS is set, it is substituted into the script.
 */
test.before(async t => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');

  t.context = {
    readFile: fsp.readFile,
    env: process.env,
    writeFile: fsp.writeFile,
    bundle: await bundleCache.load(
      asset('../../../../src/contracts/gimix/gimix.js'),
      'gimix',
    ),
  };
});

const redactImportDecls = txt =>
  txt.replace(/^\s*import\b\s*(.*)/gm, '// REDACTED: $1');
const omitExportKewords = txt => txt.replace(/^\s*export\b\s*/gm, '');
// cf. ses rejectImportExpressions
// https://github.com/endojs/endo/blob/ebc8f66e9498f13085a8e64e17fc2f5f7b528faa/packages/ses/src/transforms.js#L143
const hideImportExpr = txt => txt.replace(/\bimport\b/g, 'XMPORT');

test('module to script: redact imports; omit export keywords', t => {
  const modText = `
import { E, Far } from '@endo/far';

/** @param {import('wonderland').Carol} carol */
export contst alice = (carol) => {
    E(bob).greet(carol);
};
    `;

  const expected = `
// REDACTED: { E, Far } from '@endo/far';

/** @param {XMPORT('wonderland').Carol} carol */
contst alice = (carol) => {
    E(bob).greet(carol);
};
    `;

  const script = hideImportExpr(redactImportDecls(omitExportKewords(modText)));
  t.is(script.trim(), expected.trim());
});

test('check / save gimix permit', async t => {
  t.notThrows(() => JSON.parse(permit));

  // IDEA: check permit against a pattern

  // @ts-expect-error TODO: types of t.context
  const { env } = t.context;
  if (env.PERMIT) {
    // @ts-expect-error TODO: types of t.context
    const { writeFile } = t.context;
    const pretty = JSON.stringify(JSON.parse(permit), null, 2);
    t.log('write permit to', env.PERMIT);
    await t.notThrowsAsync(writeFile(env.PERMIT, pretty));
  }
});

test('check / render gimix proposal', async t => {
  // @ts-expect-error TODO: types of t.context
  const { env, readFile, bundle } = t.context;

  const modText = await readFile(
    asset('../../../../src/contracts/gimix/start-gimix.js'),
    'utf-8',
  );

  let script = hideImportExpr(redactImportDecls(omitExportKewords(modText)));

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

  if (env.SCRIPT) {
    // @ts-expect-error TODO: types of t.context
    const { writeFile } = t.context;

    t.log('write script to', env.SCRIPT);
    await t.notThrowsAsync(writeFile(env.SCRIPT, script));
  }
});
