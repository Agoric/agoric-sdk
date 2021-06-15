/* global __filename */
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
import { xsnap } from '../src/xsnap.js';
import { makeSnapstore } from '../src/snapStore.js';

const importMetaUrl = new URL(`file://${__filename}`);

const asset = async (...segments) =>
  fs.promises.readFile(
    path.join(importMetaUrl.pathname, '..', ...segments),
    'utf-8',
  );

/**
 * @param {string} name
 * @param {(request:Uint8Array) => Promise<Uint8Array>} handleCommand
 */
async function bootWorker(name, handleCommand) {
  const worker = xsnap({
    os: osType(),
    spawn,
    handleCommand,
    name,
    stdout: 'inherit',
    stderr: 'inherit',
    // debug: !!env.XSNAP_DEBUG,
  });

  const bootScript = await asset('..', 'dist', 'bundle-ses-boot.umd.js');
  await worker.evaluate(bootScript);
  return worker;
}

test('build temp file; compress to cache file', async t => {
  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());
  t.log({ pool: pool.name });
  await fs.promises.mkdir(pool.name, { recursive: true });
  const store = makeSnapstore(pool.name, {
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

test('bootstrap, save, compress', async t => {
  const vat = await bootWorker('ses-boot1', async m => m);
  t.teardown(() => vat.close());

  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());
  await fs.promises.mkdir(pool.name, { recursive: true });

  const store = makeSnapstore(pool.name, {
    ...tmp,
    ...path,
    ...fs,
    ...fs.promises,
  });

  await vat.evaluate('globalThis.x = harden({a: 1})');

  /** @type {(fn: string, fullSize: number) => number} */
  const relativeSize = (fn, fullSize) =>
    Math.round((fs.statSync(fn).size / 1024 / fullSize) * 10) / 10;

  const snapSize = {
    raw: 858,
    compression: 0.1,
  };

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

test('create, save, restore, resume', async t => {
  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());
  await fs.promises.mkdir(pool.name, { recursive: true });

  const store = makeSnapstore(pool.name, {
    ...tmp,
    ...path,
    ...fs,
    ...fs.promises,
  });

  const vat0 = await bootWorker('ses-boot2', async m => m);
  t.teardown(() => vat0.close());
  await vat0.evaluate('globalThis.x = harden({a: 1})');
  const h = await store.save(vat0.snapshot);

  const worker = await store.load(h, async snapshot => {
    const xs = xsnap({ name: 'ses-resume', snapshot, os: osType(), spawn });
    await xs.evaluate('0');
    return xs;
  });
  t.teardown(() => worker.close());
  await worker.evaluate('x.a');
  t.pass();
});

// see https://github.com/Agoric/agoric-sdk/issues/2776
test.failing('xs snapshots should be deterministic', t => {
  const h = 'abc';
  t.is('66244b4bfe92ae9138d24a9b50b492d231f6a346db0cf63543d200860b423724', h);
});
