import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';

import { makeCoreMintKeeper } from './coreMintKeeper';
import { insist } from '../../util/insist';

/*
 * A seat extent may look like:
 *
 * {
 *   id: {},
 *   offerToBeMade: [rule1, rule2],
 * }
 *
 * or:
 *
 * {
 *   id: {},
 *   offerMade: [rule1, rule2],
 * }
 *
 */

const insistSeat = seat => {
  const properties = Object.getOwnPropertyNames(seat);
  // insist(
  //   properties.length === 2,
  // )`must have the properties 'id', and 'offerToBeMade' or 'offerMade'`;
  insist(properties.includes('id'))`must include 'id'`;
  insist(
    properties.includes('offerToBeMade') || properties.includes('offerMade'),
  )`must include 'offerToBeMade' or 'offerMade'`;
  insist(
    passStyleOf(seat.id) === 'presence' &&
      Object.entries(seat.id).length === 0 &&
      seat.id.constructor === Object,
  )`id should be an empty object`;
  insist(
    passStyleOf(seat.offerToBeMade) === 'copyArray' ||
      passStyleOf(seat.offerMade) === 'copyArray',
  )`an offer should be an array`;
  return seat;
};

/**
 * `makeSeatConfigMaker` exists in order to pass in two makeUseObj
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
function makeSeatConfigMaker(makeUseObjForPayment, makeUseObjForPurse) {
  function makeSeatConfig() {
    function* makePaymentTrait(_corePayment, assay) {
      const payment = yield harden({
        // This creates a new use object which destroys the payment
        unwrap: () => makeUseObjForPayment(assay, payment),
      });
      return payment;
    }

    function* makePurseTrait(_corePurse, assay) {
      const purse = yield harden({
        // This creates a new use object which empties the purse
        unwrap: () => makeUseObjForPurse(assay, purse),
      });
      return purse;
    }

    function* makeMintTrait(_coreMint) {
      return yield harden({});
    }

    function* makeAssayTrait(_coreAssay) {
      return yield harden({});
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
  return makeSeatConfig;
}

export { makeSeatConfigMaker };
