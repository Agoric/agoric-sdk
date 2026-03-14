import { initSwingStore } from '@agoric/swing-store';
import { buildVatController, type SwingSetConfig } from '@agoric/swingset-vat';
import { makeRunUtils } from '@agoric/swingset-vat/tools/run-utils.js';
import { resolve as importMetaResolve } from 'import-meta-resolve';

import type { ExecutionContext } from 'ava';

type BuiltController = Awaited<ReturnType<typeof buildVatController>>;
type RunUtils = ReturnType<typeof makeRunUtils>;

export type ForkedController = {
  controller: BuiltController;
  EV: RunUtils['EV'];
  getCrankNumber: () => number;
  runUtils: RunUtils;
  shutdown: () => Promise<void>;
};

export type ControllerFixture = {
  forkController: (
    options?: Partial<{
      deviceEndowments: Record<string, unknown>;
      pinVatRoots: string[];
    }>,
  ) => Promise<ForkedController>;
};

export type BridgeHarness = {
  assert: (condition: unknown, message?: string) => void;
  fail: (message?: string) => never;
};

export type BridgeBackend = (obj: any) => unknown;

type SourceSpecEntry =
  | string
  | {
      sourceSpec: string;
    };

type ResolvedSourceSpecEntry = {
  sourceSpec: string;
};

type SourceSpecEntries = Record<string, SourceSpecEntry>;

type SetupBase = (context: {
  controller: BuiltController;
  runUtils: RunUtils;
}) => Promise<void>;

type ControllerFixtureOptions = {
  bootstrapArgs?: unknown[];
  config: SwingSetConfig;
  pinVatRoots?: string[];
  baseDeviceEndowments?: Record<string, unknown>;
  setupBase?: SetupBase;
};

type BootControllerFixtureOptions = Omit<ControllerFixtureOptions, 'config'> & {
  testModuleUrl: string;
  bootstrap?: string;
  bootstrapSourceSpec?: string;
  vats?: SourceSpecEntries;
  bundles?: SourceSpecEntries;
  devices?: SourceSpecEntries;
  bundleCachePath?: string;
  defaultReapInterval?: string;
  includeDevDependencies?: boolean;
};

export const makeBridgeDeviceEndowments = (
  t: BridgeHarness,
  bridgeBackends: Record<string, BridgeBackend> = {},
) => ({
  bridge: {
    t,
    bridgeBackends,
  },
});

export const makeThrowingBridgeHarness = (): BridgeHarness => ({
  assert(condition, message) {
    if (!condition) {
      throw new Error(String(message));
    }
  },
  fail(message) {
    throw new Error(String(message));
  },
});

const isRelativeSourceSpec = (sourceSpec: string) =>
  sourceSpec.startsWith('./') || sourceSpec.startsWith('../');

export const resolveSourceSpec = async (
  testModuleUrl: string,
  entry: SourceSpecEntry,
): Promise<ResolvedSourceSpecEntry> => {
  const sourceSpec = typeof entry === 'string' ? entry : entry.sourceSpec;
  return {
    sourceSpec: isRelativeSourceSpec(sourceSpec)
      ? new URL(sourceSpec, testModuleUrl).pathname
      : new URL(importMetaResolve(sourceSpec, testModuleUrl)).pathname,
  };
};

const resolveSourceSpecEntries = async (
  testModuleUrl: string,
  entries: SourceSpecEntries = {},
) => {
  const resolvedEntries = await Promise.all(
    Object.entries(entries).map(async ([name, entry]) => [
      name,
      await resolveSourceSpec(testModuleUrl, entry),
    ]),
  );
  return Object.fromEntries(resolvedEntries);
};

export const makeBootSwingSetConfig = async ({
  testModuleUrl,
  bootstrap = 'bootstrap',
  bootstrapSourceSpec = '@agoric/swingset-vat/tools/bootstrap-relay.js',
  vats = {},
  bundles = {},
  devices = {},
  bundleCachePath = 'bundles',
  defaultReapInterval = 'never',
  includeDevDependencies = false,
}: {
  testModuleUrl: string;
  bootstrap?: string;
  bootstrapSourceSpec?: string;
  vats?: SourceSpecEntries;
  bundles?: SourceSpecEntries;
  devices?: SourceSpecEntries;
  bundleCachePath?: string;
  defaultReapInterval?: string;
  includeDevDependencies?: boolean;
}): Promise<SwingSetConfig> =>
  harden({
    bootstrap,
    bundleCachePath,
    defaultReapInterval,
    includeDevDependencies,
    vats: {
      [bootstrap]: await resolveSourceSpec(testModuleUrl, bootstrapSourceSpec),
      ...(await resolveSourceSpecEntries(testModuleUrl, vats)),
    },
    bundles: await resolveSourceSpecEntries(testModuleUrl, bundles),
    devices: await resolveSourceSpecEntries(testModuleUrl, devices),
  });

export const makeControllerFixture = async ({
  bootstrapArgs = [],
  config,
  pinVatRoots = ['bootstrap'],
  baseDeviceEndowments = {},
  setupBase,
}: ControllerFixtureOptions): Promise<ControllerFixture> => {
  const swingStore = initSwingStore();
  const controller = await buildVatController(
    config,
    bootstrapArgs,
    { kernelStorage: swingStore.kernelStorage },
    baseDeviceEndowments,
  );

  try {
    for (const vatName of pinVatRoots) {
      controller.pinVatRoot(vatName);
    }
    await controller.run();
    const runUtils = makeRunUtils(controller);
    if (setupBase) {
      await setupBase({ controller, runUtils });
    }
    const serialized = swingStore.debug.serialize();

    return {
      forkController: async ({
        deviceEndowments = {},
        pinVatRoots: forkPinVatRoots = pinVatRoots,
      } = {}) => {
        const forkStore = initSwingStore(null, { serialized });
        const forkController = await buildVatController(
          config,
          bootstrapArgs,
          { kernelStorage: forkStore.kernelStorage },
          deviceEndowments,
        );
        for (const vatName of forkPinVatRoots) {
          forkController.pinVatRoot(vatName);
        }
        await forkController.run();

        const forkRunUtils = makeRunUtils(forkController);
        return {
          controller: forkController,
          EV: forkRunUtils.EV,
          getCrankNumber: () =>
            Number(forkStore.kernelStorage.kvStore.get('crankNumber')),
          runUtils: forkRunUtils,
          shutdown: async () => {
            await forkController.shutdown();
            await forkStore.hostStorage.close();
          },
        };
      },
    };
  } finally {
    await controller.shutdown();
    await swingStore.hostStorage.close();
  }
};

export const makeBootControllerFixture = async ({
  testModuleUrl,
  bootstrap,
  bootstrapSourceSpec,
  vats,
  bundles,
  devices,
  bundleCachePath,
  defaultReapInterval,
  includeDevDependencies,
  bootstrapArgs,
  pinVatRoots,
  baseDeviceEndowments,
  setupBase,
}: BootControllerFixtureOptions) =>
  makeControllerFixture({
    bootstrapArgs,
    pinVatRoots,
    baseDeviceEndowments,
    setupBase,
    config: await makeBootSwingSetConfig({
      testModuleUrl,
      bootstrap,
      bootstrapSourceSpec,
      vats,
      bundles,
      devices,
      bundleCachePath,
      defaultReapInterval,
      includeDevDependencies,
    }),
  });

export const forkScenario = async (
  t: ExecutionContext<{ forkController: ControllerFixture['forkController'] }>,
  options?: Parameters<ControllerFixture['forkController']>[0],
) => {
  const scenario = await t.context.forkController(options);
  t.teardown(() => scenario.shutdown());
  return scenario;
};
