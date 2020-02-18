import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';
import { assert, details } from '@agoric/assert';

import { makeObjListMathHelpers } from './utils';

// Operations for arrays with unique objects identifying and providing
// information about Zoe invites.

const assertInviteExtent = inviteExtent => {
  assert(
    passStyleOf(inviteExtent) === 'copyRecord',
    details`inviteExtent should be a record`,
  );
  const properties = Object.getOwnPropertyNames(inviteExtent);
  // The `handle` is how the use object will be looked up
  assert(properties.includes('handle'), details`must include 'handle'`);
  assert(
    passStyleOf(inviteExtent.handle) === 'presence' &&
      Object.entries(inviteExtent.handle).length === 0 &&
      Object.getPrototypeOf(inviteExtent.handle) === Object.prototype,
    details`handle should be an empty object`,
  );
  assert(
    properties.includes('instanceHandle'),
    details`must include 'instanceHandle'`,
  );
  assert(
    passStyleOf(inviteExtent.instanceHandle) === 'presence' &&
      Object.entries(inviteExtent.instanceHandle).length === 0 &&
      Object.getPrototypeOf(inviteExtent.instanceHandle) === Object.prototype,
    details`instanceHandle should be an empty object`,
  );
  return true;
};

const getHandle = obj => obj.handle;

const inviteMathHelpers = makeObjListMathHelpers(assertInviteExtent, getHandle);

harden(inviteMathHelpers);
export default inviteMathHelpers;
