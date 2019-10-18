import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';

import { noCustomization } from '../../config/noCustomization';
import { makeCoreMintKeeper } from '../../config/coreMintKeeper';
import { insist } from '../../../util/insist';

const insistEscrowReceipt = extent => {
  const properties = Object.getOwnPropertyNames(extent);
  insist(
    properties.length === 2,
  )`must have the properties 'id', and 'conditions'`;
  insist(properties.includes('id'))`must include 'id'`;
  insist(properties.includes('conditions'))`must include 'conditions'`;
  insist(
    passStyleOf(extent.id) === 'presence' &&
      Object.entries(extent.id).length === 0 &&
      extent.id.constructor === Object,
  )`id should be an empty object`;
  insist(
    passStyleOf(extent.conditions) === 'copyRecord',
  )`conditions should be a record`;
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
