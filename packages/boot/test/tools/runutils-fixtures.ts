import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildKernelBundle } from '@agoric/swingset-vat/src/controller/initializeSwingset.js';
import {
  makeSwingsetTestKit,
  type SwingsetTestKitSnapshot,
} from '../../tools/supports.js';

const FIXTURE_VERSION = 3;

const here = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(here, '../fixtures/runutils');

export const RUNUTILS_FIXTURE_SPECS = {
  'vow-offer-results': {
    configSpecifier:
      '@agoric/vm-config/decentral-itest-orchestration-config.json',
    description: 'Boot snapshot for vow-offer-results tests',
  },
} as const;

export type RunUtilsFixtureName = keyof typeof RUNUTILS_FIXTURE_SPECS;

type FixtureMetadata = {
  version: typeof FIXTURE_VERSION;
  kernelBundleSha512: string;
  storageSnapshot?: SwingsetTestKitSnapshot['storageSnapshot'];
};
type FixtureKernelBundle = NonNullable<SwingsetTestKitSnapshot['kernelBundle']>;

const listNames = () => Object.keys(RUNUTILS_FIXTURE_SPECS);

export const isRunUtilsFixtureName = (
  name: string,
): name is RunUtilsFixtureName => {
  return listNames().includes(name);
};

const fixturePath = (name: RunUtilsFixtureName) => `${fixtureDir}/${name}`;
const fixtureMetadataPath = (name: RunUtilsFixtureName) =>
  `${fixturePath(name)}/metadata.json`;
const fixtureSwingStorePath = (name: RunUtilsFixtureName) =>
  `${fixturePath(name)}/swingstore`;
const fixtureKernelBundlePath = (name: RunUtilsFixtureName) =>
  `${fixturePath(name)}/kernel-bundle.json`;

export const availableRunUtilsFixtureNames = (): RunUtilsFixtureName[] =>
  listNames().filter(isRunUtilsFixtureName);

export const createRunUtilsFixture = async (
  name: RunUtilsFixtureName,
  log: (...args: unknown[]) => void = console.log,
) => {
  const spec = RUNUTILS_FIXTURE_SPECS[name];
  const path = fixturePath(name);
  const swingStorePath = fixtureSwingStorePath(name);
  const kernelBundle = await buildKernelBundle();
  await fs.rm(path, { recursive: true, force: true });
  await fs.mkdir(path, { recursive: true });

  const kit = await makeSwingsetTestKit(log, undefined, {
    configSpecifier: spec.configSpecifier,
    swingStorePath,
  });
  try {
    await kit.controller.snapshotAllVats();
    await kit.swingStore.hostStorage.commit();
    const metadata: FixtureMetadata = {
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

export const loadRunUtilsFixture = async (
  name: RunUtilsFixtureName,
): Promise<SwingsetTestKitSnapshot> => {
  const [metadataBody, kernelBundleBody] = await Promise.all([
    fs.readFile(fixtureMetadataPath(name), 'utf-8'),
    fs.readFile(fixtureKernelBundlePath(name), 'utf-8'),
  ]);
  const metadata = JSON.parse(metadataBody) as FixtureMetadata;
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

export const loadOrCreateRunUtilsFixture = async (
  name: RunUtilsFixtureName,
  log: (...args: unknown[]) => void = console.log,
): Promise<SwingsetTestKitSnapshot> => {
  try {
    return await loadRunUtilsFixture(name);
  } catch (cause) {
    log(
      `RunUtils fixture ${name} missing or stale; regenerating at ${fixturePath(name)}`,
      cause,
    );
    await createRunUtilsFixture(name, log);
    return loadRunUtilsFixture(name);
  }
};
