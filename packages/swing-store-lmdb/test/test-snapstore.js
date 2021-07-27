/* global require */
// @ts-check

import '@agoric/install-ses';
import { spawn } from 'child_process';
import { type as osType } from 'os';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import tmp from 'tmp';
import { xsnap } from '@agoric/xsnap';
import { makeSnapStore } from '../src/snapStore.js';

const { freeze } = Object;

const ld = (() => {
  /** @param { string } ref */
  // WARNING: ambient
  const resolve = ref => require.resolve(ref);
  const readFile = fs.promises.readFile;
  return freeze({
    resolve,
    /**  @param { string } ref */
    asset: async ref => readFile(resolve(ref), 'utf-8'),
  });
})();

/**
 * @param {string} name
 * @param {(request:Uint8Array) => Promise<Uint8Array>} handleCommand
 * @param {string} script to execute
 */
async function bootWorker(name, handleCommand, script) {
  const worker = xsnap({
    os: osType(),
    spawn,
    handleCommand,
    name,
    stdout: 'inherit',
    stderr: 'inherit',
    // debug: !!env.XSNAP_DEBUG,
  });

  await worker.evaluate(script);
  return worker;
}

/**
 * @param {string} name
 * @param {(request:Uint8Array) => Promise<Uint8Array>} handleCommand
 */
async function bootSESWorker(name, handleCommand) {
  const bootScript = await ld.asset(
    '@agoric/xsnap/dist/bundle-ses-boot.umd.js',
  );
  return bootWorker(name, handleCommand, bootScript);
}

/** @type {(fn: string, fullSize: number) => number} */
const relativeSize = (fn, fullSize) =>
  Math.round((fs.statSync(fn).size / 1024 / fullSize) * 10) / 10;

const snapSize = {
  raw: 417,
  SESboot: 858,
  compression: 0.1,
};

test('build temp file; compress to cache file', async t => {
  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());
  t.log({ pool: pool.name });
  await fs.promises.mkdir(pool.name, { recursive: true });
  const store = makeSnapStore(pool.name, {
    ...tmp,
    ...path,
    ...fs,
    ...fs.promises,
  });
  let keepTmp = '';
  const hash = await store.save(async fn => {
    t.falsy(fs.existsSync(fn));
    fs.writeFileSync(fn, 'abc');
    keepTmp = fn;
  });
  t.is(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    hash,
  );
  t.falsy(
    fs.existsSync(keepTmp),
    'temp file should have been deleted after withTempName',
  );
  const dest = path.resolve(pool.name, `${hash}.gz`);
  t.truthy(fs.existsSync(dest), 'save() produces file named after hash');
  const gz = fs.readFileSync(dest);
  const contents = zlib.gunzipSync(gz);
  t.is(contents.toString(), 'abc', 'gunzip(contents) matches original');
});

test(`create XS Machine, snapshot (${snapSize.raw} Kb), compress to ${snapSize.compression}x`, async t => {
  const vat = await bootWorker('xs1', async m => m, '1 + 1');
  t.teardown(() => vat.close());

  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());
  await fs.promises.mkdir(pool.name, { recursive: true });

  const store = makeSnapStore(pool.name, {
    ...tmp,
    ...path,
    ...fs,
    ...fs.promises,
  });

  const h = await store.save(async snapFile => {
    await vat.snapshot(snapFile);
  });

  const zfile = path.resolve(pool.name, `${h}.gz`);
  t.is(
    relativeSize(zfile, snapSize.raw),
    snapSize.compression,
    'compressed snapshots are smaller',
  );
});

test('SES bootstrap, save, compress', async t => {
  const vat = await bootSESWorker('ses-boot1', async m => m);
  t.teardown(() => vat.close());

  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());

  const store = makeSnapStore(pool.name, {
    ...tmp,
    ...path,
    ...fs,
    ...fs.promises,
  });

  await vat.evaluate('globalThis.x = harden({a: 1})');

  const h = await store.save(async snapFile => {
    await vat.snapshot(snapFile);
  });

  const zfile = path.resolve(pool.name, `${h}.gz`);
  t.is(
    relativeSize(zfile, snapSize.SESboot),
    snapSize.compression,
    'compressed snapshots are smaller',
  );
});

test('create SES worker, save, restore, resume', async t => {
  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());

  const store = makeSnapStore(pool.name, {
    ...tmp,
    ...path,
    ...fs,
    ...fs.promises,
  });

  const vat0 = await bootSESWorker('ses-boot2', async m => m);
  t.teardown(() => vat0.close());
  await vat0.evaluate('globalThis.x = harden({a: 1})');
  const h = await store.save(vat0.snapshot);

  const worker = await store.load(h, async snapshot => {
    const xs = xsnap({ name: 'ses-resume', snapshot, os: osType(), spawn });
    await xs.isReady();
    return xs;
  });
  t.teardown(() => worker.close());
  await worker.evaluate('x.a');
  t.pass();
});

// see https://github.com/Agoric/agoric-sdk/issues/2776
test.failing('XS + SES snapshots should be deterministic', t => {
  const h = 'abc';
  t.is('66244b4bfe92ae9138d24a9b50b492d231f6a346db0cf63543d200860b423724', h);
});
