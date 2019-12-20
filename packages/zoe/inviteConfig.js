import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';

import { noCustomization } from '@agoric/ertp/core/config/noCustomization';
import { makeCoreMintKeeper } from '@agoric/ertp/core/config/coreMintKeeper';
import { insist } from '@agoric/ertp/util/insist';

const insistInviteExtent = inviteExtent => {
  const properties = Object.getOwnPropertyNames(inviteExtent);
  // The `handle` is how the use object will be looked up
  insist(properties.includes('handle'))`must include 'handle'`;
  insist(
    passStyleOf(inviteExtent.handle) === 'presence' &&
      Object.entries(inviteExtent.handle).length === 0 &&
      inviteExtent.handle.constructor === Object,
  )`handle should be an empty object`;
  insist(
    passStyleOf(inviteExtent) === 'copyRecord',
  )`inviteExtent should be a record`;
  return true;
};

function makeInviteConfig() {
  return harden({
    ...noCustomization,
    makeMintKeeper: makeCoreMintKeeper,
    extentOpsName: 'uniExtentOps',
    extentOpsArgs: [insistInviteExtent],
  });
}

export { makeInviteConfig };
