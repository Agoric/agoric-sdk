import { tameMetering } from '@agoric/tame-metering';
const replaceGlobalMeter = tameMetering();

// the tamed RegExp lacks a property that SES is expecting to see
Object.defineProperties(RegExp, {
  [Symbol.species]: {
    get() { return RegExp; },
  },
});

