// @ts-check

import { E } from '@agoric/eventual-send';
import { makeLocalAmountMath } from '@agoric/ertp';
import { makeStore } from '@agoric/store';

// Note that this cannot be in the wallet, since that is a different
// vat than the deploy scripts, and thus the amountMath would not be
// local to the deploy scripts

// TODO: reconcile this API with a PetnameManager API

/** @type {MakeLocalAmountMathManager} */
export const makeLocalAmountManager = issuerManager => {
  /** @type {Store<Petname,DeprecatedAmountMath>} */
  const localAmountMath = makeStore('petname');

  const saveLocalAmountMath = async petname => {
    const issuer = E(issuerManager).get(petname);
    const amountMath = await makeLocalAmountMath(issuer);
    localAmountMath.init(petname, amountMath);
  };

  /** @type {SaveLocalAmountMaths} */
  const saveLocalAmountMaths = async petnames => {
    return Promise.all(petnames.map(saveLocalAmountMath));
  };

  /** @type {GetLocalAmountMath} */
  const getLocalAmountMath = petname => localAmountMath.get(petname);

  return {
    saveLocalAmountMaths,
    getLocalAmountMath,
  };
};
