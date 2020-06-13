import * as c from './constants';
import { tameMetering } from './tame';

const shim = `\
(() => {
  const globalThis = this;

  // Declare to the metering tamer that we're using SES 1 (pre-0.8).
  const SES1ErrorConstructor = Error;

  // Provide imported references to the metering tamer.
  const c = ${JSON.stringify(c)}
  let replaceGlobalMeter;
  replaceGlobalMeter = (${tameMetering})();

  let neutered;
  this.Q = () => {
    if (!neutered) {
      neutered = true;
      return replaceGlobalMeter;
    }
    throw Error('Cannot execute twice');
  };
})()`;

// Adapt to ESM.
export const SES1TameMeteringShim = shim.replace(
  /_[a-z0-9]{3}\u200d\.g\./gs,
  '',
);
export const SES1ReplaceGlobalMeter = s => s.evaluate('Q()');
