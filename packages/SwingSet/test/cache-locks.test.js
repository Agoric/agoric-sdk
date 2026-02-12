import test from 'ava';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import {
  makeNodeBundleCache,
  provideBundleCache,
} from '../tools/bundleTool.js';

const setupFixture = async t => {
  const fixturesRoot = fileURLToPath(new URL('./', import.meta.url));
  const root = await mkdtemp(path.join(fixturesRoot, 'tmp-bundle-tool-'));
  t.teardown(async () => rm(root, { recursive: true, force: true }));
  const bundlesDir = path.join(root, 'bundles');
  await mkdir(bundlesDir, { recursive: true });
  const sourcePath = path.join(root, 'toy-source.js');
  const fixtureSourcePath = fileURLToPath(
    new URL('./vat-empty-setup.js', import.meta.url),
  );
  const fixtureSource = await readFile(fixtureSourcePath, 'utf8');
  await writeFile(sourcePath, fixtureSource, 'utf8');
  return { bundlesDir, sourcePath };
};

test.serial('load() breaks stale lock from dead owner pid', async t => {
  const { bundlesDir, sourcePath } = await setupFixture(t);
  const lockRoot = path.join(bundlesDir, '.bundle-locks');
  const lockPath = path.join(lockRoot, `${encodeURIComponent('toy')}.lock`);
  await mkdir(lockPath, { recursive: true });
  await writeFile(
    path.join(lockPath, 'owner.json'),
    JSON.stringify({ pid: 999_999_999, createdAt: Date.now() }),
    'utf8',
  );

  const cache = await makeNodeBundleCache(bundlesDir, {}, s => import(s));
  const loaded = await cache.load(sourcePath, 'toy');
  t.truthy(loaded);
});

test.serial('failed load does not poison later load for same key', async t => {
  const { bundlesDir, sourcePath } = await setupFixture(t);
  const fixtureSourcePath = fileURLToPath(
    new URL('./vat-empty-setup.js', import.meta.url),
  );
  const fixtureSource = await readFile(fixtureSourcePath, 'utf8');
  await rm(sourcePath, { force: true });

  const cache = await makeNodeBundleCache(bundlesDir, {}, s => import(s));
  await t.throwsAsync(() => cache.load(sourcePath, 'toy'), {
    message:
      /no such file or directory|Cannot find module|Failed to load module|Cannot find file/i,
  });
  await writeFile(sourcePath, fixtureSource, 'utf8');

  const loaded = await cache.load(sourcePath, 'toy');
  t.truthy(loaded);
});

test('provideBundleCache returns same promise for same key', async t => {
  const { bundlesDir, sourcePath } = await setupFixture(t);
  const loadModule = specifier => import(specifier);
  const opts = { format: 'endoZipBase64', dev: false };

  const [cacheA, cacheB] = await Promise.all([
    provideBundleCache(bundlesDir, opts, loadModule),
    provideBundleCache(bundlesDir, opts, loadModule),
  ]);
  t.is(cacheA, cacheB);

  const [bundleA, bundleB] = await Promise.all([
    cacheA.load(sourcePath, 'toy'),
    cacheB.load(sourcePath, 'toy'),
  ]);
  t.deepEqual(bundleA, bundleB);
});

test('concurrent load() calls for same key settle without hanging', async t => {
  const { bundlesDir, sourcePath } = await setupFixture(t);
  const cache = await makeNodeBundleCache(bundlesDir, {}, s => import(s));
  const loads = Array.from({ length: 24 }, () => cache.load(sourcePath, 'toy'));
  const bundles = await Promise.all(loads);
  t.is(bundles.length, 24);
  t.truthy(bundles[0]);
  t.deepEqual(bundles[0], bundles[bundles.length - 1]);
});

test('load() accepts file URL source specs', async t => {
  const { bundlesDir, sourcePath } = await setupFixture(t);
  const cache = await makeNodeBundleCache(bundlesDir, {}, s => import(s));
  const sourceURL = pathToFileURL(sourcePath).href;
  const loaded = await cache.load(sourceURL, 'toy');
  t.truthy(loaded);
});
