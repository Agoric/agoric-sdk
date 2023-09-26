// @ts-check

import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

const trace = makeTracer('RV');

const HR = '----------------';

/**
 * @param {BootstrapPowers &
 *   import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapSpace} space
 */
export const restartKread = async ({ consume }) => {
  console.log(HR);
  console.log(HR);
  trace('restartKread start');

  trace('testing restarts');
  const { chainTimerService, chainStorage, board, kreadKit } =
    await deeplyFulfilledObject(
      harden({
        chainTimerService: consume.chainTimerService,
        chainStorage: consume.chainStorage,
        board: consume.board,
        // @ts-ignore
        kreadKit: consume.kreadKit,
      }),
    );

  const kreadPowers = await deeplyFulfilledObject(
    harden({
      // @ts-ignore
      storageNode: E(chainStorage).makeChildNode("test"),
      marshaller: E(board).getReadonlyMarshaller(),
    }),
  );
  const clock = await E(chainTimerService).getClock();
  const kreadConfig = harden({
    clock,
    seed: 303,
  });

  const privateArgs = harden({ powers: kreadPowers, ...kreadConfig });
  await E(kreadKit.adminFacet).restartContract(privateArgs);
};
harden(restartKread);

export const getManifestForRestart = (_powers, options) => ({
  manifest: {
    [restartKread.name]: {
      consume: {
        chainTimerService: true,
        chainStorage: true,
        board: true,
        kreadKit: true,
      },
      produce: {},
    },
  },
  options,
});
harden(getManifestForRestart);
