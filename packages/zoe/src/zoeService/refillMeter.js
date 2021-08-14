// @ts-check

import { E } from '@agoric/eventual-send';
import { makeAsyncIterableFromNotifier as iterateNotifier } from '@agoric/notifier';

/**
 * @param {Meter} meter
 * @param {ChargeForComputrons} chargeForComputrons
 * @param {ERef<FeePurse>} feePurse
 */
const refillMeter = async (meter, chargeForComputrons, feePurse) => {
  const meterNotifier = E(meter).getNotifier();

  for await (const remaining of iterateNotifier(meterNotifier)) {
    const incrementBy = await chargeForComputrons(feePurse);
    console.log(
      `Meter down to ${remaining}. Refilling to ${remaining + incrementBy}`,
    );
    await E(meter).addRemaining(incrementBy); // will notify at the same threshold as before
  }
};
harden(refillMeter);
export { refillMeter };
