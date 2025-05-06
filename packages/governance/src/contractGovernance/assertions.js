import { Fail } from '@endo/errors';
import { isRemotable } from '@endo/marshal';
import { assertIsRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { mustMatch } from '@agoric/store';
import { RelativeTimeRecordShape, TimestampRecordShape } from '@agoric/time';

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
  mustMatch(value, RelativeTimeRecordShape);
};
harden(assertRelativeTime);

const assertTimestamp = value => {
  mustMatch(value, TimestampRecordShape, 'timestamp');
};
harden(assertTimestamp);

export {
  makeLooksLikeBrand,
  makeAssertInstallation,
  makeAssertInstance,
  makeAssertBrandedRatio,
  assertRelativeTime,
  assertTimestamp,
};
