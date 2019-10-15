import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';

import { noCustomization } from '../../config/noCustomization';
import { makeCoreMintKeeper } from '../../config/coreMintKeeper';
import { insist } from '../../../util/insist';

const insistSeat = seat => {
  const properties = Object.getOwnPropertyNames(seat);
  insist(
    properties.length === 2,
  )`must have the properties 'id', and 'offerToBeMade' or 'offerMade'`;
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

// This is used by Zoe to create the EscrowReceipt ERTP payments
function makeEscrowReceiptConfig() {
  return harden({
    ...noCustomization,
    makeMintKeeper: makeCoreMintKeeper,
    extentOpsName: 'uniExtentOps',
    extentOpsArgs: [insistSeat],
  });
}

export { makeEscrowReceiptConfig };
