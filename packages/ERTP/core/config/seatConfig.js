import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';

import { makeCoreMintKeeper } from './coreMintKeeper';
import { insist } from '../../util/insist';

const insistSeat = seat => {
  const properties = Object.getOwnPropertyNames(seat);
  // The `handle` is how the use object will be looked up
  insist(properties.includes('handle'))`must include 'handle'`;
  insist(
    passStyleOf(seat.handle) === 'presence' &&
      Object.entries(seat.handle).length === 0 &&
      seat.handle.constructor === Object,
  )`handle should be an empty object`;
  insist(passStyleOf(seat) === 'copyRecord')`seat should be a record`;
  return seat;
};

/**
 * `makeSeatConfig` is passed in two makeUseObj
 * functions, one for payments and one for purses. A "use object" has
 * all of the non-ERTP methods for assets that are designed to be
 * used. For instance, a stock might have vote() and
 * claimCashDividends() as methods. The use object is associated with
 * an underlying asset that provides the authority to use it.
 * @param {function} makeUseObjForPayment creates a "use object" for
 * payments
 * @param {function} makeUseObjForPurse creates a "use object" for
 * purses
 */
function makeSeatConfig(makeUseObjForPayment, makeUseObjForPurse) {
  function makePaymentTrait({ assay }) {
    return payment =>
      harden({
        // This creates a new use object which destroys the payment
        unwrap: () => makeUseObjForPayment(assay, payment),
      });
  }

  function makePurseTrait({ assay }) {
    return purse =>
      harden({
        // This creates a new use object which empties the purse
        unwrap: () => makeUseObjForPurse(assay, purse),
      });
  }

  function makeMintTrait() {
    return _coreMint => harden({});
  }

  function makeAssayTrait() {
    return _coreAssay => harden({});
  }

  return harden({
    makePaymentTrait,
    makePurseTrait,
    makeMintTrait,
    makeAssayTrait,
    makeMintKeeper: makeCoreMintKeeper,
    extentOpsName: 'uniExtentOps',
    extentOpsArgs: [insistSeat],
  });
}

export { makeSeatConfig };
