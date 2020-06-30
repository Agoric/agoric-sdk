/* global harden */

import { makeMarshal } from '@agoric/marshal';
import makeStore from '@agoric/store';
import { assert, details } from '@agoric/assert';

// Marshalling for the UI should only use the user's petnames. We will
// call marshalling for the UI "dehydration" and "hydration" to distinguish it from
// other marshalling.
export const makeDehydrator = (initialUnnamedCount = 0) => {
  let unnamedCount = initialUnnamedCount;

  const petnameKindToMapping = makeStore();

  const searchOrder = [];

  const makeMapping = kind => {
    assert.typeof(kind, 'string', details`kind ${kind} must be a string`);
    const valToPetname = makeStore();
    const petnameToVal = makeStore();
    const addPetname = (petname, val) => {
      assert(
        !petnameToVal.has(petname),
        details`petname ${petname} is already in use`,
      );
      assert(!valToPetname.has(val), details`val ${val} already has a petname`);
      petnameToVal.init(petname, val);
      valToPetname.init(val, petname);
    };
    const mapping = harden({
      valToPetname,
      petnameToVal,
      addPetname,
      kind,
    });
    petnameKindToMapping.init(kind, mapping);
    return mapping;
  };

  const unnamedMapping = makeMapping('unnamed');

  const addToUnnamed = val => {
    unnamedCount += 1;
    const placeholder = `unnamed-${unnamedCount}`;
    const placeholderName = harden({
      kind: 'unnamed',
      petname: placeholder,
    });
    unnamedMapping.addPetname(placeholder, val);
    return placeholderName;
  };

  // look through the petname stores in order and create a new
  // unnamed record if not found.
  const convertValToName = val => {
    for (let i = 0; i < searchOrder.length; i += 1) {
      const kind = searchOrder[i];
      const { valToPetname } = petnameKindToMapping.get(kind);
      if (valToPetname.has(val)) {
        return harden({
          kind,
          petname: valToPetname.get(val),
        });
      }
    }
    // not found in any map
    const placeholderName = addToUnnamed(val);
    return placeholderName;
  };

  const convertNameToVal = ({ kind, petname }) => {
    const { petnameToVal } = petnameKindToMapping.get(kind);
    return petnameToVal.get(petname);
  };
  const { serialize: dehydrate, unserialize: hydrate } = makeMarshal(
    convertValToName,
    convertNameToVal,
  );
  return harden({
    hydrate,
    dehydrate,
    makeMapping: kind => {
      const mapping = makeMapping(kind);
      searchOrder.push(kind);
      return mapping;
    },
  });
};
