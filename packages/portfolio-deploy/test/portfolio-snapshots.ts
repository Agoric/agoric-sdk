import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type SwingsetTestKitSnapshot } from '@aglocal/boot/tools/supports.js';
import {
  getCurrentKernelBundleSha512,
  getSnapshotManagerType,
  loadOrCreateCachedSnapshot,
  loadOrCreateRunUtilsSnapshot,
} from '../../boot/test/tools/runutils-snapshots.js';
import {
  preparePortfolioNewContractContext,
  preparePortfolioReadyContext,
} from './portfolio-snapshot-setup.ts';
import { makeWalletFactoryContext } from './walletFactory.ts';

// Bumped from 1: added `snapshotFingerprint`, so a pre-existing cached
// snapshot lacking it (and therefore never invalidated by portfolio source
// changes) is unconditionally treated as stale on upgrade.
const SNAPSHOT_VERSION = 2;

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const repoKey = createHash('sha256')
  .update(repoRoot)
  .digest('hex')
  .slice(0, 12);
const snapshotDir = resolve(
  tmpdir(),
  `agoric-sdk-test-snapshots-${repoKey}`,
  'portfolio-deploy',
  'runutils',
);

export const PORTFOLIO_SNAPSHOT_SPECS = {
  'portfolio-ready': {
    configSpecifier:
      '@agoric/vm-config/decentral-itest-orchestration-config.json',
    description: 'Boot snapshot with portfolio proposals applied',
  },
  'portfolio-new-contract-ready': {
    configSpecifier:
      '@agoric/vm-config/decentral-itest-orchestration-config.json',
    description: 'Portfolio snapshot after removing and starting a fresh ymax0',
  },
} as const;

export type PortfolioSnapshotName = keyof typeof PORTFOLIO_SNAPSHOT_SPECS;

type SnapshotBody = {
  version: typeof SNAPSHOT_VERSION;
  snapshotFingerprint: string;
  kernelBundleSha512: string;
  storageSnapshot?: SwingsetTestKitSnapshot['storageSnapshot'];
};
type SnapshotKernelBundle = NonNullable<
  SwingsetTestKitSnapshot['kernelBundle']
>;

/**
 * Files/directories whose *content* determines what ends up installed in
 * the snapshot, beyond the SwingSet kernel bundle itself:
 * - `../src` -- the other portfolio-deploy proposal builders
 *   (chain-info/access-token-setup/etc.) bundle fresh from source on every
 *   proposal run, no intermediate build step, so hashing their source
 *   directly is accurate.
 * - `portfolio-snapshot-setup.ts` -- decides which proposals run at all.
 * - `../dist/portfolio.contract.bundle.js` -- the esbuild output that
 *   `portfolio.build.js`'s `install(...)` actually reads (see its
 *   `../dist/portfolio.contract.bundle.js` reference); this is what
 *   `yarn build` produces from portfolio-contract/portfolio-api/
 *   orchestration source, so hashing it (rather than that whole source
 *   tree) tracks exactly what's installed, including staleness relative
 *   to source if `yarn build` wasn't rerun -- this file not existing
 *   yet is intentionally a hard failure via `hashFile`, not a silent skip.
 * This file is deliberately excluded from its own list: editing it to fix
 * the fingerprint logic itself doesn't need to invalidate the cache.
 */
const fingerprintInputs = [
  resolve(here, '../src'),
  resolve(here, './portfolio-snapshot-setup.ts'),
  resolve(here, '../dist/portfolio.contract.bundle.js'),
];

const hashFile = async (filePath: string): Promise<string> => {
  const content = await fs.readFile(filePath);
  return createHash('sha512').update(content).digest('hex');
};

/** Resolves `path` to every file it names -- itself if a file, or every file it recursively contains if a directory. */
const listFiles = async (path: string): Promise<string[]> => {
  const st = await fs.stat(path);
  if (!st.isDirectory()) return [path];
  const relPaths = await fs.readdir(path, { recursive: true });
  const results: string[] = [];
  await Promise.all(
    relPaths.map(async relPath => {
      const fullPath = resolve(path, relPath);
      if ((await fs.stat(fullPath)).isFile()) results.push(fullPath);
    }),
  );
  return results;
};

const computePortfolioSnapshotFingerprint = async (
  name: PortfolioSnapshotName,
  kernelBundleSha512: string,
): Promise<string> => {
  const hash = createHash('sha512');
  hash.update(`snapshot-version:${SNAPSHOT_VERSION}\n`);
  hash.update(`snapshot-name:${name}\n`);
  hash.update(`kernel-bundle:${kernelBundleSha512}\n`);
  // Not otherwise reflected in `kernelBundleSha512` (kernel.js content
  // doesn't depend on manager type): without this, switching
  // `SWINGSET_WORKER_TYPE` regenerates the underlying `orchestration-base`
  // snapshot (see `getSnapshotManagerType` in runutils-snapshots.ts) but
  // this layered snapshot would keep silently reusing the old one.
  hash.update(`manager-type:${getSnapshotManagerType()}\n`);

  const allFiles = (await Promise.all(fingerprintInputs.map(listFiles)))
    .flat()
    .sort();
  const fileHashes = await Promise.all(allFiles.map(hashFile));
  for (const [i, filePath] of allFiles.entries()) {
    hash.update(`path:${filePath}\n`);
    hash.update(`hash:${fileHashes[i]}\n`);
  }
  return hash.digest('hex');
};

const listNames = () => Object.keys(PORTFOLIO_SNAPSHOT_SPECS);

export const isPortfolioSnapshotName = (
  name: string,
): name is PortfolioSnapshotName => {
  return listNames().includes(name);
};

export const availablePortfolioSnapshotNames = (): PortfolioSnapshotName[] =>
  listNames().filter(isPortfolioSnapshotName);

const snapshotPath = (name: PortfolioSnapshotName) => `${snapshotDir}/${name}`;
const snapshotMetadataPath = (name: PortfolioSnapshotName) =>
  `${snapshotPath(name)}/metadata.json`;
const snapshotKernelBundlePath = (name: PortfolioSnapshotName) =>
  `${snapshotPath(name)}/kernel-bundle.json`;
const snapshotSwingStorePath = (name: PortfolioSnapshotName) =>
  `${snapshotPath(name)}/swingstore`;

export const createPortfolioSnapshot = async (
  name: PortfolioSnapshotName,
  log: (...args: unknown[]) => void = console.log,
) => {
  const spec = PORTFOLIO_SNAPSHOT_SPECS[name];
  const baseSnapshot =
    name === 'portfolio-ready'
      ? await loadOrCreateRunUtilsSnapshot('orchestration-base', log)
      : await loadOrCreatePortfolioSnapshot('portfolio-ready', log);
  const kernelBundle = baseSnapshot.kernelBundle;
  if (!kernelBundle) {
    throw Error(`Snapshot ${name} base snapshot is missing kernel bundle data`);
  }
  // Computed up front (and before the expensive bootstrap below) so a
  // missing `dist/portfolio.contract.bundle.js` (i.e. `yarn build` not yet
  // run) fails fast with a clear error instead of after several minutes.
  const snapshotFingerprint = await computePortfolioSnapshotFingerprint(
    name,
    kernelBundle.endoZipBase64Sha512,
  );
  const path = snapshotPath(name);
  const swingStorePath = snapshotSwingStorePath(name);
  await fs.rm(path, { recursive: true, force: true });
  await fs.mkdir(path, { recursive: true });
  const kit = await makeWalletFactoryContext(
    { log } as Parameters<typeof makeWalletFactoryContext>[0],
    spec.configSpecifier,
    {
      snapshot: baseSnapshot,
      swingStorePath,
      // A no-op today (passing `snapshot` makes `makeSwingsetTestKit` skip
      // config generation entirely, inheriting the base snapshot's
      // already-baked-in manager type), but correct to state explicitly
      // and safe if that ever changes.
      defaultManagerType: getSnapshotManagerType(),
    },
  );
  try {
    if (name === 'portfolio-ready') {
      await preparePortfolioReadyContext(kit);
    } else {
      await preparePortfolioNewContractContext(kit);
    }
    await kit.controller.snapshotAllVats();
    await kit.swingStore.hostStorage.commit();

    const metadata: SnapshotBody = {
      version: SNAPSHOT_VERSION,
      snapshotFingerprint,
      kernelBundleSha512: kernelBundle.endoZipBase64Sha512,
      storageSnapshot: kit.makeStorageSnapshot(),
    };
    await fs.writeFile(
      snapshotKernelBundlePath(name),
      JSON.stringify(kernelBundle),
      'utf-8',
    );
    await fs.writeFile(
      snapshotMetadataPath(name),
      JSON.stringify(metadata, null, 2),
      'utf-8',
    );
    return path;
  } finally {
    await kit.shutdown();
  }
};

export const loadPortfolioSnapshot = async (
  name: PortfolioSnapshotName,
): Promise<SwingsetTestKitSnapshot> => {
  const [metadataBody, kernelBundleBody, currentKernelBundleSha512] =
    await Promise.all([
      fs.readFile(snapshotMetadataPath(name), 'utf-8'),
      fs.readFile(snapshotKernelBundlePath(name), 'utf-8'),
      getCurrentKernelBundleSha512(),
    ]);
  const metadata = JSON.parse(metadataBody) as SnapshotBody;
  if (metadata.version !== SNAPSHOT_VERSION) {
    throw new Error(
      `Unsupported snapshot version ${metadata.version}, expected ${SNAPSHOT_VERSION}`,
    );
  }
  const kernelBundle = JSON.parse(kernelBundleBody) as SnapshotKernelBundle;
  if (kernelBundle.endoZipBase64Sha512 !== metadata.kernelBundleSha512) {
    throw new Error(`Snapshot ${name} kernel bundle hash mismatch`);
  }
  if (currentKernelBundleSha512 !== metadata.kernelBundleSha512) {
    throw new Error(`Snapshot ${name} current kernel bundle hash mismatch`);
  }
  const expectedSnapshotFingerprint = await computePortfolioSnapshotFingerprint(
    name,
    currentKernelBundleSha512,
  );
  if (metadata.snapshotFingerprint !== expectedSnapshotFingerprint) {
    throw new Error(`Snapshot ${name} fingerprint mismatch`);
  }
  return {
    swingStoreDir: snapshotSwingStorePath(name),
    kernelBundle,
    storageSnapshot: metadata.storageSnapshot,
  };
};

export const loadOrCreatePortfolioSnapshot = async (
  name: PortfolioSnapshotName,
  log: (...args: unknown[]) => void = console.log,
): Promise<SwingsetTestKitSnapshot> =>
  loadOrCreateCachedSnapshot({
    load: () => loadPortfolioSnapshot(name),
    create: () => createPortfolioSnapshot(name, log),
    cachePath: snapshotPath(name),
    label: `Portfolio snapshot ${name}`,
    log,
  });
