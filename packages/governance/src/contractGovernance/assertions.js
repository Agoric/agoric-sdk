// @ts-check

import { isRemotable } from '@endo/marshal';
import { assertIsRatio } from '@agoric/zoe/src/contractSupport/ratio.js';

const { details: X } = assert;

const makeLooksLikeBrand = name => {
  return brand => {
    assert(
      // @ts-ignore value is undifferentiated to this point
      isRemotable(brand),
      X`value for ${name} must be a brand, was ${brand}`,
    );
  };
};
harden(makeLooksLikeBrand);

const makeAssertInstallation = name => {
  return installation => {
    // TODO(3344): add a better assertion once Zoe validates installations
    assert(
      typeof installation === 'object' &&
        Object.getOwnPropertyNames(installation).length === 1,
      X`value for ${name} must be an Installation, was ${installation}`,
    );
  };
};
harden(makeAssertInstallation);

const makeAssertInstance = name => {
  return instance => {
    // TODO(3344): add a better assertion once Zoe validates instances
    assert(
      typeof instance === 'object' &&
        Object.getOwnPropertyNames(instance).length === 0,
      X`value for ${name} must be an Instance, was ${instance}`,
    );
  };
};
harden(makeAssertInstance);

const makeAssertBrandedRatio = (name, modelRatio) => {
  return ratio => {
    assertIsRatio(ratio);
    assert(
      ratio.numerator.brand === modelRatio.numerator.brand,
      X`Numerator brand for ${name} must be ${modelRatio.numerator.brand}`,
    );
    assert(
      ratio.denominator.brand === modelRatio.denominator.brand,
      X`Denominator brand for ${name} must be ${modelRatio.denominator.brand}`,
    );
    return true;
  };
};
harden(makeAssertBrandedRatio);

export {
  makeLooksLikeBrand,
  makeAssertInstallation,
  makeAssertInstance,
  makeAssertBrandedRatio,
};
