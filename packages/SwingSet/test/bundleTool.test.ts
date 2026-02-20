import test, { type ExecutionContext } from 'ava';
import { mkdtemp, mkdir, readFile, rm, utimes, writeFile } from 'fs/promises';
import path from 'path';
import { setTimeout as delay } from 'timers/promises';
import { fileURLToPath, pathToFileURL } from 'url';

import {
  makeAmbientBundleToolPowers,
  makeNodeBundleCache,
} from '../tools/bundleTool.js';

// Use a directory ignored by AVA watch mode (via ignore-by-default).
// See https://github.com/novemberborn/ignore-by-default/blob/master/index.js
const watchIgnoredTmpRoot = path.join(
  fileURLToPath(new URL('../', import.meta.url)),
  '.sass-cache',
);
const testPowers = makeAmbientBundleToolPowers({
  eventSink: { onBundleToolEvent: () => {} },
});

const setupFixture = async (t: ExecutionContext) => {
  await mkdir(watchIgnoredTmpRoot, { recursive: true });
  const root = await mkdtemp(
    path.join(watchIgnoredTmpRoot, 'swing-bundle-tool-'),
  );
  t.teardown(async () => rm(root, { recursive: true, force: true }));
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'swing-bundle-tool',
      private: true,
      type: 'module',
    }),
    'utf8',
  );
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

  const cache = await makeNodeBundleCache(
    bundlesDir,
    {},
    s => import(s),
    testPowers,
  );
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

  const cache = await makeNodeBundleCache(
    bundlesDir,
    {},
    s => import(s),
    testPowers,
  );
  await t.throwsAsync(() => cache.load(sourcePath, 'toy'), {
    message:
      /no such file or directory|Cannot find module|Failed to load module|Cannot find file/i,
  });
  await writeFile(sourcePath, fixtureSource, 'utf8');

  const loaded = await cache.load(sourcePath, 'toy');
  t.truthy(loaded);
});

test('makeNodeBundleCache returns independent cache instances', async t => {
  const { bundlesDir, sourcePath } = await setupFixture(t);
  const loadModule = specifier => import(specifier);
  const opts = { format: 'endoZipBase64', dev: false };

  const cacheAP = makeNodeBundleCache(bundlesDir, opts, loadModule, testPowers);
  const cacheBP = makeNodeBundleCache(bundlesDir, opts, loadModule, testPowers);
  t.not(cacheAP, cacheBP, 'cache promises are distinct');
  const [cacheA, cacheB] = await Promise.all([cacheAP, cacheBP]);
  t.not(cacheA, cacheB, 'cache fulfilments are distinct');

  const [bundleA, bundleB] = await Promise.all([
    cacheA.load(sourcePath, 'toy'),
    cacheB.load(sourcePath, 'toy'),
  ]);
  t.is(bundleA, bundleB, 'cache.load fulfills to same value for same key');
  t.deepEqual(
    bundleA,
    bundleB,
    'cache.load fulfills to deeply equal value for same key',
  );
});

test('concurrent load() calls for same key settle without hanging', async t => {
  const { bundlesDir, sourcePath } = await setupFixture(t);
  const cache = await makeNodeBundleCache(
    bundlesDir,
    {},
    s => import(s),
    testPowers,
  );
  const loads = Array.from({ length: 24 }, () => cache.load(sourcePath, 'toy'));
  const bundles = await Promise.all(loads);
  t.is(bundles.length, 24);
  t.truthy(bundles[0]);
  for (const [i, bundle] of bundles.entries()) {
    t.deepEqual(bundle, bundles[0], `bundles[${i}] matches bundles[0]`);
  }
});

test('load() accepts file URL source specs', async t => {
  const { bundlesDir, sourcePath } = await setupFixture(t);
  const cache = await makeNodeBundleCache(
    bundlesDir,
    {},
    s => import(s),
    testPowers,
  );
  const sourceURL = pathToFileURL(sourcePath).href;
  const loaded = await cache.load(sourceURL, 'toy');
  t.truthy(loaded);
});

test.serial('load() rebuilds when dependency file changes', async t => {
  await mkdir(watchIgnoredTmpRoot, { recursive: true });
  const root = await mkdtemp(
    path.join(watchIgnoredTmpRoot, 'swing-bundle-tool-'),
  );
  t.teardown(async () => rm(root, { recursive: true, force: true }));
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'swing-bundle-tool',
      private: true,
      type: 'module',
    }),
    'utf8',
  );
  const bundlesDir = path.join(root, 'bundles');
  await mkdir(bundlesDir, { recursive: true });

  const depPath = path.join(root, 'dep.js');
  const sourcePath = path.join(root, 'source.js');
  await writeFile(depPath, 'export const marker = 1;\n', 'utf8');
  await writeFile(
    sourcePath,
    "import { marker } from './dep.js';\nexport default marker;\n",
    'utf8',
  );

  const cache = await makeNodeBundleCache(
    bundlesDir,
    {},
    s => import(s),
    testPowers,
  );
  await cache.load(sourcePath, 'toy');
  const bundlePath = path.join(bundlesDir, 'bundle-toy.js');
  const before = await readFile(bundlePath, 'utf8');

  // Ensure mtime differences are observable on coarser filesystems.
  await delay(20);
  await writeFile(depPath, 'export const marker = 2;\n', 'utf8');
  await cache.load(sourcePath, 'toy');
  const after = await readFile(bundlePath, 'utf8');

  t.not(before, after);
});

test.serial(
  'add() and validateOrAdd() accept relative and absolute specs',
  async t => {
    const { bundlesDir, sourcePath } = await setupFixture(t);
    const cache = await makeNodeBundleCache(
      bundlesDir,
      {},
      s => import(s),
      testPowers,
    );

    const originalCwd = process.cwd();
    const relDir = path.dirname(sourcePath);
    const relSource = `./${path.basename(sourcePath)}`;
    try {
      process.chdir(relDir);
      const added = await cache.add(relSource, 'toy-add');
      t.truthy(added.bundleFileName);
    } finally {
      process.chdir(originalCwd);
    }

    const relFromCwd = path.relative(process.cwd(), sourcePath);
    const validated = await cache.validateOrAdd(relFromCwd, 'toy-validate');
    t.truthy(validated.bundleFileName);
  },
);

test.serial(
  'load() breaks lock with invalid pid and malformed owner',
  async t => {
    const { bundlesDir, sourcePath } = await setupFixture(t);
    const lockRoot = path.join(bundlesDir, '.bundle-locks');
    await mkdir(lockRoot, { recursive: true });

    const invalidPidLock = path.join(
      lockRoot,
      `${encodeURIComponent('toy')}.lock`,
    );
    await mkdir(invalidPidLock, { recursive: true });
    await writeFile(
      path.join(invalidPidLock, 'owner.json'),
      JSON.stringify({ pid: 0, createdAt: Date.now() }),
      'utf8',
    );

    const malformedLock = path.join(
      lockRoot,
      `${encodeURIComponent('toy-bad')}.lock`,
    );
    await mkdir(malformedLock, { recursive: true });
    await writeFile(path.join(malformedLock, 'owner.json'), '{', 'utf8');
    const staleTime = Date.now() - 120_000;
    await utimes(malformedLock, staleTime / 1000, staleTime / 1000);

    const cache = await makeNodeBundleCache(
      bundlesDir,
      {},
      s => import(s),
      testPowers,
    );
    const loaded = await cache.load(sourcePath, 'toy');
    t.truthy(loaded);
    const loadedBad = await cache.load(sourcePath, 'toy-bad');
    t.truthy(loadedBad);
  },
);

test.serial('load() handles missing lock path', async t => {
  const { bundlesDir, sourcePath } = await setupFixture(t);
  const lockRoot = path.join(bundlesDir, '.bundle-locks');
  await mkdir(lockRoot, { recursive: true });

  const brokenLock = path.join(
    lockRoot,
    `${encodeURIComponent('toy-broken')}.lock`,
  );
  await mkdir(brokenLock, { recursive: true });
  await writeFile(
    path.join(brokenLock, 'owner.json'),
    JSON.stringify({ pid: process.pid, createdAt: Date.now() }),
    'utf8',
  );
  setTimeout(() => {
    void rm(brokenLock, { recursive: true, force: true });
  }, 0);

  const cache = await makeNodeBundleCache(
    bundlesDir,
    {},
    s => import(s),
    testPowers,
  );
  const loaded = await cache.load(sourcePath, 'toy-broken');
  t.truthy(loaded);
});

test.serial('loadRegistry() loads bundles and validates entries', async t => {
  const { bundlesDir, sourcePath } = await setupFixture(t);
  const cache = await makeNodeBundleCache(
    bundlesDir,
    {},
    s => import(s),
    testPowers,
  );

  const registry = {
    demo: {
      sourceSpec: sourcePath,
      bundleName: 'toy-registry',
    },
  };
  const loaded = await cache.loadRegistry(registry);
  t.truthy(loaded.demoBundle);

  await t.throwsAsync(
    () => cache.loadRegistry({ missing: { bundleName: 'bad' } }),
    {
      message: /must include sourceSpec or packagePath/i,
    },
  );
});
