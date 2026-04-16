import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { buildKernelBundle } from '@agoric/swingset-vat/src/controller/initializeSwingset.js';
import {
  makeSwingsetTestKit,
  type SwingsetTestKitSnapshot,
} from '../../tools/supports.js';

const SNAPSHOT_VERSION = 1;
const SNAPSHOT_LOCK_WAIT_MS = 15 * 60_000;

const here = dirname(fileURLToPath(import.meta.url));
const snapshotDir = resolve(here, '../cache/runutils');

export const RUNUTILS_SNAPSHOT_SPECS = {
  'demo-base': {
    configSpecifier: '@agoric/vm-config/decentral-demo-config.json',
    description: 'Boot snapshot for demo config tests',
  },
  'main-vaults-base': {
    configSpecifier: '@agoric/vm-config/decentral-main-vaults-config.json',
    description: 'Boot snapshot for main-vaults wallet tests',
  },
  'itest-vaults-base': {
    configSpecifier: '@agoric/vm-config/decentral-itest-vaults-config.json',
    description: 'Boot snapshot for itest vaults tests',
  },
  'orchestration-base': {
    configSpecifier:
      '@agoric/vm-config/decentral-itest-orchestration-config.json',
    description: 'Boot snapshot for orchestration tests',
  },
} as const;

export type RunUtilsSnapshotName = keyof typeof RUNUTILS_SNAPSHOT_SPECS;

type SnapshotMetadata = {
  version: typeof SNAPSHOT_VERSION;
  snapshotFingerprint: string;
  kernelBundleSha512: string;
  storageSnapshot?: SwingsetTestKitSnapshot['storageSnapshot'];
};
type SnapshotKernelBundle = NonNullable<
  SwingsetTestKitSnapshot['kernelBundle']
>;
type RunUtilsSnapshotSpec = {
  configSpecifier: string;
  description: string;
};

const listNames = () => Object.keys(RUNUTILS_SNAPSHOT_SPECS);

export const isRunUtilsSnapshotName = (
  name: string,
): name is RunUtilsSnapshotName => {
  return listNames().includes(name);
};

const snapshotPath = (name: RunUtilsSnapshotName) => `${snapshotDir}/${name}`;
const snapshotMetadataPath = (name: RunUtilsSnapshotName) =>
  `${snapshotPath(name)}/metadata.json`;
const snapshotSwingStorePath = (name: RunUtilsSnapshotName) =>
  `${snapshotPath(name)}/swingstore`;
const snapshotKernelBundlePath = (name: RunUtilsSnapshotName) =>
  `${snapshotPath(name)}/kernel-bundle.json`;
const snapshotLockPath = (name: RunUtilsSnapshotName) =>
  `${snapshotPath(name)}.lock`;
const regeneratedMarkerDir = `${snapshotDir}/.ci-regenerated`;
const regeneratedMarkerPath = (name: RunUtilsSnapshotName) =>
  `${regeneratedMarkerDir}/${name}`;

export const availableRunUtilsSnapshotNames = (): RunUtilsSnapshotName[] =>
  listNames().filter(isRunUtilsSnapshotName);

const getSnapshotSpec = (name: RunUtilsSnapshotName): RunUtilsSnapshotSpec =>
  RUNUTILS_SNAPSHOT_SPECS[name];

const resolveInputPath = (specifier: string) => {
  if (specifier.startsWith('.')) {
    return fileURLToPath(new URL(specifier, import.meta.url));
  }
  return fileURLToPath(import.meta.resolve(specifier));
};

const sharedSnapshotInputSpecifiers = [
  './runutils-snapshots.ts',
  '../../tools/supports.ts',
] as const;

const getSnapshotInputPaths = (name: RunUtilsSnapshotName) => {
  const spec = getSnapshotSpec(name);
  const inputSpecifiers = [
    ...sharedSnapshotInputSpecifiers,
    spec.configSpecifier,
  ];
  return [...new Set(inputSpecifiers.map(resolveInputPath))].sort();
};

const hashFile = async (filePath: string) => {
  const content = await fs.readFile(filePath);
  return createHash('sha512').update(content).digest('hex');
};

export const computeRunUtilsSnapshotFingerprint = async (
  name: RunUtilsSnapshotName,
  kernelBundleSha512?: string,
) => {
  const hash = createHash('sha512');
  hash.update(`snapshot-version:${SNAPSHOT_VERSION}\n`);
  hash.update(`snapshot-name:${name}\n`);
  const effectiveKernelBundleSha512 =
    kernelBundleSha512 || (await buildKernelBundle()).endoZipBase64Sha512;
  hash.update(`kernel-bundle:${effectiveKernelBundleSha512}\n`);

  const inputPaths = getSnapshotInputPaths(name);
  for (const inputPath of inputPaths) {
    hash.update(`path:${inputPath}\n`);
    hash.update(`hash:${await hashFile(inputPath)}\n`);
  }

  return hash.digest('hex');
};

export const computeRunUtilsSnapshotFingerprints = async () => {
  const kernelBundleSha512 = (await buildKernelBundle()).endoZipBase64Sha512;
  const names = availableRunUtilsSnapshotNames().sort();
  return Object.fromEntries(
    await Promise.all(
      names.map(async name => [
        name,
        await computeRunUtilsSnapshotFingerprint(name, kernelBundleSha512),
      ]),
    ),
  ) as Record<RunUtilsSnapshotName, string>;
};

export const computeRunUtilsSnapshotsFingerprint = async () => {
  const hash = createHash('sha512');
  const fingerprints = await computeRunUtilsSnapshotFingerprints();
  for (const name of Object.keys(fingerprints).sort()) {
    hash.update(`${name}:${fingerprints[name as RunUtilsSnapshotName]}\n`);
  }
  return hash.digest('hex');
};

export const createRunUtilsSnapshot = async (
  name: RunUtilsSnapshotName,
  log: (...args: unknown[]) => void = console.log,
) => {
  const spec = getSnapshotSpec(name);
  const path = snapshotPath(name);
  const swingStorePath = snapshotSwingStorePath(name);
  const kernelBundle = await buildKernelBundle();
  const snapshotFingerprint = await computeRunUtilsSnapshotFingerprint(
    name,
    kernelBundle.endoZipBase64Sha512,
  );
  await fs.rm(path, { recursive: true, force: true });
  await fs.mkdir(path, { recursive: true });

  const kit = await makeSwingsetTestKit(log, undefined, {
    configSpecifier: spec.configSpecifier,
    swingStorePath,
  });
  try {
    await kit.controller.snapshotAllVats();
    await kit.swingStore.hostStorage.commit();
    const metadata: SnapshotMetadata = {
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
    await fs.mkdir(regeneratedMarkerDir, { recursive: true });
    await fs.writeFile(regeneratedMarkerPath(name), '', 'utf-8');
    return path;
  } finally {
    await kit.shutdown();
  }
};

export const loadRunUtilsSnapshot = async (
  name: RunUtilsSnapshotName,
): Promise<SwingsetTestKitSnapshot> => {
  const [metadataBody, kernelBundleBody] = await Promise.all([
    fs.readFile(snapshotMetadataPath(name), 'utf-8'),
    fs.readFile(snapshotKernelBundlePath(name), 'utf-8'),
  ]);
  const metadata = JSON.parse(metadataBody) as SnapshotMetadata;
  if (metadata.version !== SNAPSHOT_VERSION) {
    throw new Error(
      `Unsupported snapshot version ${metadata.version}, expected ${SNAPSHOT_VERSION}`,
    );
  }
  const currentKernelBundleSha512 = (await buildKernelBundle())
    .endoZipBase64Sha512;
  const expectedSnapshotFingerprint = await computeRunUtilsSnapshotFingerprint(
    name,
    currentKernelBundleSha512,
  );
  if (metadata.snapshotFingerprint !== expectedSnapshotFingerprint) {
    throw new Error(`Snapshot ${name} fingerprint mismatch`);
  }
  const kernelBundle = JSON.parse(kernelBundleBody) as SnapshotKernelBundle;
  if (kernelBundle.endoZipBase64Sha512 !== metadata.kernelBundleSha512) {
    throw new Error(`Snapshot ${name} kernel bundle hash mismatch`);
  }
  if (metadata.kernelBundleSha512 !== currentKernelBundleSha512) {
    throw new Error(`Snapshot ${name} current kernel bundle hash mismatch`);
  }
  return {
    swingStoreDir: snapshotSwingStorePath(name),
    kernelBundle,
    storageSnapshot: metadata.storageSnapshot,
  };
};

export const loadOrCreateRunUtilsSnapshot = async (
  name: RunUtilsSnapshotName,
  log: (...args: unknown[]) => void = console.log,
): Promise<SwingsetTestKitSnapshot> => {
  const lockPath = snapshotLockPath(name);
  const waitStart = performance.now();
  await fs.mkdir(snapshotDir, { recursive: true });
  for (;;) {
    try {
      return await loadRunUtilsSnapshot(name);
    } catch {
      // fall through to lock acquisition and possible regeneration
    }
    let lock;
    try {
      lock = await fs.open(lockPath, 'wx');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'EEXIST') {
        const waitMs = performance.now() - waitStart;
        if (waitMs > SNAPSHOT_LOCK_WAIT_MS) {
          throw new Error(
            `Timed out waiting ${(waitMs / 1000).toFixed(1)}s for snapshot lock ${lockPath}`,
          );
        }
        await delay(100);
        continue;
      }
      throw e;
    }
    try {
      try {
        return await loadRunUtilsSnapshot(name);
      } catch {
        log(
          `RunUtils snapshot ${name} missing or stale; regenerating at ${snapshotPath(name)}`,
        );
        const regenStart = performance.now();
        await createRunUtilsSnapshot(name, log);
        const regenMs = Math.round(performance.now() - regenStart);
        log(
          `RunUtils snapshot ${name} regenerated in ${(regenMs / 1000).toFixed(1)}s (${regenMs}ms)`,
        );
        return loadRunUtilsSnapshot(name);
      }
    } finally {
      await lock.close();
      await fs.rm(lockPath, { force: true });
    }
  }
};
