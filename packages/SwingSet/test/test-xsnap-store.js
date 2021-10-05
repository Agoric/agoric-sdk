import '@agoric/install-ses';

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { type as osType } from 'os';
import tmp from 'tmp';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { xsnap } from '@agoric/xsnap';
import { makeSnapStore, makeSnapStoreIO } from '@agoric/swing-store';
import { resolve as importMetaResolve } from 'import-meta-resolve';

const { freeze } = Object;

const ld = (() => {
  /** @param { string } ref */
  // WARNING: ambient
  const resolve = async ref => {
    const url = await importMetaResolve(ref, import.meta.url);
    return new URL(url).pathname;
  };
  const readFile = fs.promises.readFile;
  return freeze({
    resolve,
    /**  @param { string } ref */
    asset: async ref => readFile(await resolve(ref), 'utf-8'),
  });
})();

/** @type {(fn: string, fullSize: number) => number} */
const relativeSize = (fn, fullSize) =>
  Math.round((fs.statSync(fn).size / 1024 / fullSize) * 10) / 10;

const snapSize = {
  raw: 417,
  SESboot: 858,
};

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

test(`create XS Machine, snapshot (${snapSize.raw} Kb), compress to smaller`, async t => {
  const vat = await bootWorker('xs1', async m => m, '1 + 1');
  t.teardown(() => vat.close());

  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());
  await fs.promises.mkdir(pool.name, { recursive: true });

  const store = makeSnapStore(pool.name, makeSnapStoreIO());

  const h = await store.save(async snapFile => {
    await vat.snapshot(snapFile);
  });

  const zfile = path.resolve(pool.name, `${h}.gz`);
  t.true(
    relativeSize(zfile, snapSize.raw) < 0.5,
    'compressed snapshots are smaller',
  );
});

test('SES bootstrap, save, compress', async t => {
  const vat = await bootSESWorker('ses-boot1', async m => m);
  t.teardown(() => vat.close());

  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());

  const store = makeSnapStore(pool.name, makeSnapStoreIO());

  await vat.evaluate('globalThis.x = harden({a: 1})');

  const h = await store.save(async snapFile => {
    await vat.snapshot(snapFile);
  });

  const zfile = path.resolve(pool.name, `${h}.gz`);
  t.true(
    relativeSize(zfile, snapSize.SESboot) < 0.5,
    'compressed snapshots are smaller',
  );
});

test('create SES worker, save, restore, resume', async t => {
  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());

  const store = makeSnapStore(pool.name, makeSnapStoreIO());

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

/**
 * The snapshot hashes in this test are, naturally,
 * sensitive to any changes in bundle-ses-boot.umd.js;
 * that is: any changes to the SES shim or to the
 * xsnap-worker supervisor.
 * They are also sensitive to the XS code itself.
 */
test('XS + SES snapshots are long-term deterministic', async t => {
  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());
  t.log({ pool: pool.name });
  await fs.promises.mkdir(pool.name, { recursive: true });
  const store = makeSnapStore(pool.name, makeSnapStoreIO());

  const vat = await bootWorker('xs1', async m => m, '1 + 1');
  t.teardown(() => vat.close());

  const h1 = await store.save(vat.snapshot);

  t.is(
    h1,
    '9b90f329ae31e65bfb9b3f8436ceb581e160b3ec9984e9ac1dcef23ae78338fb',
    'initial snapshot',
  );

  const bootScript = await ld.asset(
    '@agoric/xsnap/dist/bundle-ses-boot.umd.js',
  );
  await vat.evaluate(bootScript);

  const h2 = await store.save(vat.snapshot);
  t.is(
    h2,
    'c75fc90f431088d792041570238996e6877b0a5f75c55bd81a7c2f23dc015732',
    'after SES boot',
  );

  await vat.evaluate('globalThis.x = harden({a: 1})');
  const h3 = await store.save(vat.snapshot);
  t.is(
    h3,
    '7a01e1e5aab4ac104db5e082c069261b16dc36849ceedb5d714cc19895dd23ec',
    'after use of harden()',
  );
});

async function makeTestSnapshot(t) {
  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());
  // t.log({ pool: pool.name });
  await fs.promises.mkdir(pool.name, { recursive: true });
  const store = makeSnapStore(pool.name, makeSnapStoreIO());
  const vat = await bootWorker('xs1', async m => m, '1 + 1');
  const bootScript = await ld.asset(
    '@agoric/xsnap/dist/bundle-ses-boot.umd.js',
  );
  await vat.evaluate(bootScript);
  await vat.evaluate('globalThis.x = harden({a: 1})');
  const hash = await store.save(vat.snapshot);
  await vat.close();
  return hash;
}

test('XS + SES snapshots are short-term deterministic', async t => {
  const h1 = await makeTestSnapshot(t);
  const h2 = await makeTestSnapshot(t);
  t.is(h1, h2);
});
