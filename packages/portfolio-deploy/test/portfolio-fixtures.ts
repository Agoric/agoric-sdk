import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { type SwingsetTestKitSnapshot } from '@aglocal/boot/tools/supports.js';
import { loadOrCreateRunUtilsFixture } from '../../boot/test/tools/runutils-fixtures.js';
import {
  preparePortfolioNewContractContext,
  preparePortfolioReadyContext,
} from './portfolio-fixture-setup.ts';
import { makeWalletFactoryContext } from './walletFactory.ts';

const FIXTURE_VERSION = 1;

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const repoKey = createHash('sha256')
  .update(repoRoot)
  .digest('hex')
  .slice(0, 12);
const fixtureDir = resolve(
  tmpdir(),
  `agoric-sdk-test-fixtures-${repoKey}`,
  'portfolio-deploy',
  'runutils',
);

export const PORTFOLIO_FIXTURE_SPECS = {
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

export type PortfolioFixtureName = keyof typeof PORTFOLIO_FIXTURE_SPECS;

type FixtureBody = {
  version: typeof FIXTURE_VERSION;
  kernelBundleSha512: string;
  storageSnapshot?: SwingsetTestKitSnapshot['storageSnapshot'];
};
type FixtureKernelBundle = NonNullable<SwingsetTestKitSnapshot['kernelBundle']>;
type FixtureLockBody = {
  pid: number;
  createdAt: number;
};

const listNames = () => Object.keys(PORTFOLIO_FIXTURE_SPECS);

export const isPortfolioFixtureName = (
  name: string,
): name is PortfolioFixtureName => {
  return listNames().includes(name);
};

export const availablePortfolioFixtureNames = (): PortfolioFixtureName[] =>
  listNames().filter(isPortfolioFixtureName);

const fixturePath = (name: PortfolioFixtureName) => `${fixtureDir}/${name}`;
const fixtureMetadataPath = (name: PortfolioFixtureName) =>
  `${fixturePath(name)}/metadata.json`;
const fixtureKernelBundlePath = (name: PortfolioFixtureName) =>
  `${fixturePath(name)}/kernel-bundle.json`;
const fixtureSwingStorePath = (name: PortfolioFixtureName) =>
  `${fixturePath(name)}/swingstore`;
const fixtureLockPath = (name: PortfolioFixtureName) =>
  `${fixtureDir}/${name}.lock`;

const isProcessAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
};

const removeStaleFixtureLock = async (lockPath: string) => {
  try {
    const body = JSON.parse(
      await fs.readFile(lockPath, 'utf-8'),
    ) as Partial<FixtureLockBody>;
    if (typeof body.pid === 'number' && isProcessAlive(body.pid)) {
      return false;
    }
  } catch {
    // Unreadable or truncated lock files are treated as stale.
  }
  await fs.rm(lockPath, { force: true });
  return true;
};

export const createPortfolioFixture = async (
  name: PortfolioFixtureName,
  log: (...args: unknown[]) => void = console.log,
) => {
  const spec = PORTFOLIO_FIXTURE_SPECS[name];
  const baseSnapshot =
    name === 'portfolio-ready'
      ? await loadOrCreateRunUtilsFixture('orchestration-base', log)
      : await loadOrCreatePortfolioFixture('portfolio-ready', log);
  const kernelBundle = baseSnapshot.kernelBundle;
  if (!kernelBundle) {
    throw Error(`Fixture ${name} base snapshot is missing kernel bundle data`);
  }
  const path = fixturePath(name);
  const swingStorePath = fixtureSwingStorePath(name);
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

    const metadata: FixtureBody = {
      version: FIXTURE_VERSION,
      kernelBundleSha512: kernelBundle.endoZipBase64Sha512,
      storageSnapshot: kit.makeStorageSnapshot(),
    };
    await fs.writeFile(
      fixtureKernelBundlePath(name),
      JSON.stringify(kernelBundle),
      'utf-8',
    );
    await fs.writeFile(
      fixtureMetadataPath(name),
      JSON.stringify(metadata, null, 2),
      'utf-8',
    );
    return path;
  } finally {
    await kit.shutdown();
  }
};

export const loadPortfolioFixture = async (
  name: PortfolioFixtureName,
): Promise<SwingsetTestKitSnapshot> => {
  const [metadataBody, kernelBundleBody] = await Promise.all([
    fs.readFile(fixtureMetadataPath(name), 'utf-8'),
    fs.readFile(fixtureKernelBundlePath(name), 'utf-8'),
  ]);
  const metadata = JSON.parse(metadataBody) as FixtureBody;
  if (metadata.version !== FIXTURE_VERSION) {
    throw new Error(
      `Unsupported fixture version ${metadata.version}, expected ${FIXTURE_VERSION}`,
    );
  }
  const kernelBundle = JSON.parse(kernelBundleBody) as FixtureKernelBundle;
  if (kernelBundle.endoZipBase64Sha512 !== metadata.kernelBundleSha512) {
    throw new Error(`Fixture ${name} kernel bundle hash mismatch`);
  }
  return {
    swingStoreDir: fixtureSwingStorePath(name),
    kernelBundle,
    storageSnapshot: metadata.storageSnapshot,
  };
};

export const loadOrCreatePortfolioFixture = async (
  name: PortfolioFixtureName,
  log: (...args: unknown[]) => void = console.log,
): Promise<SwingsetTestKitSnapshot> => {
  const lockPath = fixtureLockPath(name);
  await fs.mkdir(fixtureDir, { recursive: true });
  for (;;) {
    try {
      return await loadPortfolioFixture(name);
    } catch {
      // fall through to lock acquisition and possible regeneration
    }
    let lock;
    try {
      lock = await fs.open(lockPath, 'wx');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'EEXIST') {
        if (await removeStaleFixtureLock(lockPath)) {
          continue;
        }
        await delay(100);
        continue;
      }
      throw e;
    }
    try {
      await lock.writeFile(
        JSON.stringify({ pid: process.pid, createdAt: Date.now() }),
      );
      try {
        return await loadPortfolioFixture(name);
      } catch (cause) {
        log(
          `Portfolio fixture ${name} missing or stale; regenerating at ${fixturePath(name)}`,
          cause,
        );
        await createPortfolioFixture(name, log);
        return loadPortfolioFixture(name);
      }
    } finally {
      await lock.close();
      await fs.rm(lockPath, { force: true });
    }
  }
};
