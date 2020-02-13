import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';
import { assert } from '@agoric/assert';

import { makeObjListMathHelpers } from './utils';

// Operations for arrays with unique empty objects used as identifiers
// (called handles)

const assertHandle = handle => {
  assert(passStyleOf(handle) === 'presence', 'handle should be a presence');
  const properties = Object.getOwnPropertyNames(handle);
  assert(properties.length === 0, 'must not have properties');
};

// In other uses of ObjLists, we have to do something more complex to
// get the handle. In handleMathHelpers, we have nothing other than the
// handle, so we can just return it.
const getHandle = handle => handle;

const handleMathHelpers = makeObjListMathHelpers(assertHandle, getHandle);

harden(handleMathHelpers);
export default handleMathHelpers;
