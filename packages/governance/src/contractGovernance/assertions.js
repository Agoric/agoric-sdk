// @ts-check

import { isRemotable } from '@endo/marshal';
import { assertIsRatio } from '@agoric/zoe/src/contractSupport/ratio.js';

const { details: X } = assert;

const makeLooksLikeBrand = name => {
  /** @param {Brand} brand */
  return brand => {
    isRemotable(brand) ||
      assert.fail(X`value for ${name} must be a brand, was ${brand}`);
  };
};
harden(makeLooksLikeBrand);

const makeAssertInstallation = name => {
  return installation => {
    // TODO(3344): add a better assertion once Zoe validates installations
    typeof installation === 'object' ||
      assert.fail(
        X`value for ${name} must be an Installation, was ${installation}`,
      );
  };
};
harden(makeAssertInstallation);

const makeAssertInstance = name => {
  return instance => {
    // TODO(3344): add a better assertion once Zoe validates instances
    typeof instance === 'object' ||
      assert.fail(X`value for ${name} must be an Instance, was ${instance}`);
  };
};
harden(makeAssertInstance);

const makeAssertBrandedRatio = (name, modelRatio) => {
  return ratio => {
    assertIsRatio(ratio);
    ratio.numerator.brand === modelRatio.numerator.brand ||
      assert.fail(
        X`Numerator brand for ${name} must be ${modelRatio.numerator.brand}`,
      );
    ratio.denominator.brand === modelRatio.denominator.brand ||
      assert.fail(
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
