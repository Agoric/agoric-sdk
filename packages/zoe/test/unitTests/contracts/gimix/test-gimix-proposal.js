// @ts-check
import test from 'ava';
import fsp from 'fs/promises';
import { createRequire } from 'module';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';

import { permit } from '../../../../src/contracts/gimix/start-gimix.js';
import {
  hideImportExpr,
  omitExportKewords,
  redactImportDecls,
} from './module-to-script.js';

import { oneScript as startPostalSvcScript } from '../../../../src/contracts/gimix/start-postalSvc.js';

const myRequire = createRequire(import.meta.url);

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
    /* global process */
    env: process.env,
    writeFile: fsp.writeFile,
    bundle: await bundleCache.load(
      myRequire.resolve('../../../../src/contracts/gimix/gimix.js'),
      'gimix',
    ),
  };
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
    myRequire.resolve('../../../../src/contracts/gimix/start-gimix.js'),
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

test('check / render postalSvc script', t => {
  const bundle = {
    endoZipBase64Sha512: 'deadbeef',
  };
  let script = hideImportExpr(
    redactImportDecls(omitExportKewords(`${startPostalSvcScript}`)),
  );

  script = script.replace(
    /bundleID = fail.*/,
    `bundleID = ${JSON.stringify(`b1-${bundle.endoZipBase64Sha512}`)},`,
  );
  // t.log(script);

  const c = new Compartment({ E: () => {}, Far: () => {} });
  t.notThrows(() => c.evaluate(script));
});
