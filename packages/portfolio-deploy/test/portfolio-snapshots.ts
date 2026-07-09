import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type SwingsetTestKitSnapshot } from '@aglocal/boot/tools/supports.js';
import {
  getCurrentKernelBundleSha512,
  loadOrCreateCachedSnapshot,
  loadOrCreateRunUtilsSnapshot,
} from '../../boot/test/tools/runutils-snapshots.js';
import {
  preparePortfolioNewContractContext,
  preparePortfolioReadyContext,
} from './portfolio-snapshot-setup.ts';
import { makeWalletFactoryContext } from './walletFactory.ts';

const SNAPSHOT_VERSION = 1;

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
  kernelBundleSha512: string;
  storageSnapshot?: SwingsetTestKitSnapshot['storageSnapshot'];
};
type SnapshotKernelBundle = NonNullable<
  SwingsetTestKitSnapshot['kernelBundle']
>;

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
  const path = snapshotPath(name);
  const swingStorePath = snapshotSwingStorePath(name);
  await fs.rm(path, { recursive: true, force: true });
  await fs.mkdir(path, { recursive: true });
  const kit = await makeWalletFactoryContext(
    { log } as Parameters<typeof makeWalletFactoryContext>[0],
    spec.configSpecifier,
    { snapshot: baseSnapshot, swingStorePath },
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
