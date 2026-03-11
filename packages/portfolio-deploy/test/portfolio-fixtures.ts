import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { type SwingsetTestKitSnapshot } from '@aglocal/boot/tools/supports.js';
import { loadOrCreateRunUtilsFixture } from '../../boot/test/tools/runutils-fixtures.js';
import { preparePortfolioReadyContext } from './portfolio-fixture-setup.ts';
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
} as const;

export type PortfolioFixtureName = keyof typeof PORTFOLIO_FIXTURE_SPECS;

type FixtureBody = {
  version: typeof FIXTURE_VERSION;
  snapshot: SwingsetTestKitSnapshot;
};

const listNames = () => Object.keys(PORTFOLIO_FIXTURE_SPECS);

export const isPortfolioFixtureName = (
  name: string,
): name is PortfolioFixtureName => {
  return listNames().includes(name);
};

export const availablePortfolioFixtureNames = (): PortfolioFixtureName[] =>
  listNames().filter(isPortfolioFixtureName);

const fixturePath = (name: PortfolioFixtureName) =>
  `${fixtureDir}/${name}.json`;
const fixtureLockPath = (name: PortfolioFixtureName) =>
  `${fixtureDir}/${name}.lock`;

export const createPortfolioFixture = async (
  name: PortfolioFixtureName,
  log: (...args: unknown[]) => void = console.log,
) => {
  const spec = PORTFOLIO_FIXTURE_SPECS[name];
  const baseSnapshot = await loadOrCreateRunUtilsFixture(
    'orchestration-base',
    log,
  );
  const kit = await makeWalletFactoryContext(
    { log } as Parameters<typeof makeWalletFactoryContext>[0],
    spec.configSpecifier,
    { snapshot: baseSnapshot },
  );
  try {
    await preparePortfolioReadyContext(kit);
    await kit.controller.snapshotAllVats();
    await kit.swingStore.hostStorage.commit();

    const body: FixtureBody = {
      version: FIXTURE_VERSION,
      snapshot: kit.makeSnapshot(),
    };

    await fs.mkdir(fixtureDir, { recursive: true });
    await fs.writeFile(fixturePath(name), JSON.stringify(body), 'utf-8');
    return fixturePath(name);
  } finally {
    await kit.shutdown();
  }
};

export const loadPortfolioFixture = async (
  name: PortfolioFixtureName,
): Promise<SwingsetTestKitSnapshot> => {
  const body = JSON.parse(
    await fs.readFile(fixturePath(name), 'utf-8'),
  ) as FixtureBody;
  if (body.version !== FIXTURE_VERSION) {
    throw new Error(
      `Unsupported fixture version ${body.version}, expected ${FIXTURE_VERSION}`,
    );
  }
  return body.snapshot;
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
        await delay(100);
        continue;
      }
      throw e;
    }
    try {
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
