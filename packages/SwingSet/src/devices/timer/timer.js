import { Nat } from '@endo/nat';

import { Fail } from '@endo/errors';

/**
 * Endowments for a Timer device that can be made available to SwingSet vats.
 *
 * This is code that runs in the outer half of the device, which is in the
 * primal realm. We provide a poll() function, which calls a device-level
 * function that will be provided later when the device root node is created.
 *
 * The host loop should call poll on a regular basis, and then call
 * controller.run() when it returns true.
 */
export function buildTimer() {
  const srcPath = new URL('./device-timer.js', import.meta.url).pathname;
  let devicePollFunction;

  function registerDevicePollFunction(pollFn) {
    devicePollFunction = pollFn;
  }

  // poll() is made available to the host loop so it can provide the time.
  /** @type {(time: number | bigint) => boolean} */
  function poll(time) {
    try {
      return Boolean(devicePollFunction(Nat(time)));
    } catch (e) {
      throw Fail`error in devicePollFunction: ${e}`;
    }
  }

  // srcPath and endowments are provided to buildRootDeviceNode() for use
  // during configuration.
  return {
    srcPath,
    endowments: { registerDevicePollFunction },
    poll,
  };
}
