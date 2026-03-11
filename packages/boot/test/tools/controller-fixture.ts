import { initSwingStore } from '@agoric/swing-store';
import { buildVatController, type SwingSetConfig } from '@agoric/swingset-vat';
import { makeRunUtils } from '@agoric/swingset-vat/tools/run-utils.js';

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

export const makeControllerFixture = async ({
  bootstrapArgs = [],
  config,
  pinVatRoots = ['bootstrap'],
  baseDeviceEndowments = {},
  setupBase = undefined as
    | ((context: {
        controller: BuiltController;
        runUtils: RunUtils;
      }) => Promise<void>)
    | undefined,
}: {
  bootstrapArgs?: unknown[];
  config: SwingSetConfig;
  pinVatRoots?: string[];
  baseDeviceEndowments?: Record<string, unknown>;
  setupBase?: (context: {
    controller: BuiltController;
    runUtils: RunUtils;
  }) => Promise<void>;
}): Promise<ControllerFixture> => {
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

export const forkScenario = async (
  t: ExecutionContext<{ forkController: ControllerFixture['forkController'] }>,
  options?: Parameters<ControllerFixture['forkController']>[0],
) => {
  const scenario = await t.context.forkController(options);
  t.teardown(() => scenario.shutdown());
  return scenario;
};
