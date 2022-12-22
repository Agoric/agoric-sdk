import { isRemotable } from '@endo/marshal';
import { assertIsRatio } from '@agoric/zoe/src/contractSupport/ratio.js';

const { Fail } = assert;

const makeLooksLikeBrand = name => {
  /** @param {Brand} brand */
  return brand => {
    isRemotable(brand) || Fail`value for ${name} must be a brand, was ${brand}`;
  };
};
harden(makeLooksLikeBrand);

const makeAssertInstallation = name => {
  return installation => {
    // TODO(3344): add a better assertion once Zoe validates installations
    typeof installation === 'object' ||
      Fail`value for ${name} must be an Installation, was ${installation}`;
  };
};
harden(makeAssertInstallation);

const makeAssertInstance = name => {
  return instance => {
    // TODO(3344): add a better assertion once Zoe validates instances
    typeof instance === 'object' ||
      Fail`value for ${name} must be an Instance, was ${instance}`;
  };
};
harden(makeAssertInstance);

const makeAssertBrandedRatio = (name, modelRatio) => {
  return ratio => {
    assertIsRatio(ratio);
    ratio.numerator.brand === modelRatio.numerator.brand ||
      Fail`Numerator brand for ${name} must be ${modelRatio.numerator.brand}`;
    ratio.denominator.brand === modelRatio.denominator.brand ||
      Fail`Denominator brand for ${name} must be ${modelRatio.denominator.brand}`;
    return true;
  };
};
harden(makeAssertBrandedRatio);

const assertRelativeTime = value => {
  isRemotable(value.timerBrand) || Fail`relativeTime must have a brand`;
  typeof value.relValue === 'bigint' || Fail`must have a relValue field`;
};
harden(assertRelativeTime);

const assertTimestamp = value => {
  isRemotable(value.timerBrand) || Fail`timestamp must have a brand`;
  typeof value.absValue === 'bigint' || Fail`must have an absValue field`;
};
harden(assertTimestamp);

const makeAssertTimerService = name => {
  return timerService => {
    typeof timerService === 'object' ||
      Fail`value for ${name} must be a TimerService, was ${timerService}`;
  };
};
harden(makeAssertTimerService);

export {
  makeLooksLikeBrand,
  makeAssertInstallation,
  makeAssertInstance,
  makeAssertBrandedRatio,
  assertRelativeTime,
  assertTimestamp,
  makeAssertTimerService,
};
