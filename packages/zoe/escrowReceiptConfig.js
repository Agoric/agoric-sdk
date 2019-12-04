import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';

import { noCustomization } from '@agoric/ertp/core/config/noCustomization';
import { makeCoreMintKeeper } from '@agoric/ertp/core/config/coreMintKeeper';
import { insist } from '@agoric/ertp/util/insist';

const insistEscrowReceipt = extent => {
  const properties = Object.getOwnPropertyNames(extent);
  insist(
    properties.length === 2,
  )`must have the properties 'offerHandle', and 'offerRules'`;
  insist(properties.includes('offerHandle'))`must include 'offerHandle'`;
  insist(properties.includes('offerRules'))`must include 'offerRules'`;
  insist(
    passStyleOf(extent.offerHandle) === 'presence' &&
      Object.entries(extent.offerHandle).length === 0 &&
      extent.offerHandle.constructor === Object,
  )`offerHandle should be an empty object`;
  insist(
    passStyleOf(extent.offerRules) === 'copyRecord',
  )`offerRules should be a record`;
  return extent;
};

// This is used by Zoe to create the EscrowReceipt ERTP payments
function makeEscrowReceiptConfig() {
  return harden({
    ...noCustomization,
    makeMintKeeper: makeCoreMintKeeper,
    extentOpsName: 'uniExtentOps',
    extentOpsArgs: [insistEscrowReceipt],
  });
}

export { makeEscrowReceiptConfig };
