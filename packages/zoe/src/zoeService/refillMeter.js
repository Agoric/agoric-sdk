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

  for await (const value of iterateNotifier(meterNotifier)) {
    console.log('NOTIFIED', value);
    const incrementBy = await chargeForComputrons(feePurse);
    await E(meter).addRemaining(incrementBy); // will notify at the same threshold as before
  }
};
harden(refillMeter);
export { refillMeter };
