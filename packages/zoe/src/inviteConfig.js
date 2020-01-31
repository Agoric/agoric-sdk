import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';

import { noCustomization } from '@agoric/ertp/src/config/noCustomization';
import { makeCoreMintKeeper } from '@agoric/ertp/src/config/coreMintKeeper';
import { insist } from '../../prev-ertp/util/insist';

const insistInviteExtent = inviteExtent => {
  insist(
    passStyleOf(inviteExtent) === 'copyRecord',
  )`inviteExtent should be a record`;
  const properties = Object.getOwnPropertyNames(inviteExtent);
  // The `handle` is how the use object will be looked up
  insist(properties.includes('handle'))`must include 'handle'`;
  insist(
    passStyleOf(inviteExtent.handle) === 'presence' &&
      Object.entries(inviteExtent.handle).length === 0 &&
      Object.getPrototypeOf(inviteExtent.handle) === Object.prototype,
  )`handle should be an empty object`;
  insist(properties.includes('instanceHandle'))`must include 'instanceHandle'`;
  insist(
    passStyleOf(inviteExtent.instanceHandle) === 'presence' &&
      Object.entries(inviteExtent.instanceHandle).length === 0 &&
      Object.getPrototypeOf(inviteExtent.instanceHandle) === Object.prototype,
  )`instanceHandle should be an empty object`;
  return true;
};

const inviteConfig = harden({
  ...noCustomization,
  makeMintKeeper: makeCoreMintKeeper,
  extentOpsName: 'uniExtentOps',
  extentOpsArgs: [insistInviteExtent],
});

export { inviteConfig };
