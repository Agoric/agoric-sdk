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
  compression: 0.1,
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

test(`create XS Machine, snapshot (${snapSize.raw} Kb), compress to ${snapSize.compression}x`, async t => {
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

  const store = makeSnapStore(pool.name, makeSnapStoreIO());

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
 */
test('XS + SES snapshots are deterministic', async t => {
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
    '9255590eabf7884184a2c6ad435a543f66cdcc80209cc251085f22cdf9d1e5f5',
    'initial snapshot',
  );

  const bootScript = await ld.asset(
    '@agoric/xsnap/dist/bundle-ses-boot.umd.js',
  );
  await vat.evaluate(bootScript);

  const h2 = await store.save(vat.snapshot);
  t.is(
    h2,
    '3b87e5509acf7e8ae40cca0686d0a64aeca6ed32df1279f6afa608651debd492',
    'after SES boot',
  );

  await vat.evaluate('globalThis.x = harden({a: 1})');
  const h3 = await store.save(vat.snapshot);
  t.is(
    h3,
    '2aaab1080ea8c3c6aa9cd3faeaf2d89c68f01252c5d325e2f7694f53eca6f36d',
    'after use of harden()',
  );
});
