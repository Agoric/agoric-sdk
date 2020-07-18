/* global harden */

import { makeMarshal } from '@agoric/marshal';
import makeStore from '@agoric/store';
import { assert, details, q } from '@agoric/assert';

// Marshalling for the UI should only use the user's petnames. We will
// call marshalling for the UI "dehydration" and "hydration" to distinguish it from
// other marshalling.
export const makeDehydrator = (initialUnnamedCount = 0) => {
  let unnamedCount = initialUnnamedCount;

  const petnameKindToMapping = makeStore('petnameKind');

  const searchOrder = [];

  const makeMapping = kind => {
    assert.typeof(kind, 'string', details`kind ${kind} must be a string`);
    const valToPetname = makeStore('value');
    const petnameToVal = makeStore('petname');
    const addPetname = (petname, val) => {
      assert(
        !petnameToVal.has(petname),
        details`petname ${petname} is already in use`,
      );
      assert(!valToPetname.has(val), details`val ${val} already has a petname`);
      petnameToVal.init(petname, val);
      valToPetname.init(val, petname);
    };
    const renamePetname = (petname, val) => {
      assert(
        valToPetname.has(val),
        details`val ${val} has not been previously named, would you like to add it instead?`,
      );
      assert(
        !petnameToVal.has(petname),
        details`petname ${petname} is already in use`,
      );
      // Delete the old mappings.
      const oldPetname = valToPetname.get(val);
      petnameToVal.delete(oldPetname);
      valToPetname.delete(val);

      // Add the new mappings.
      petnameToVal.init(petname, val);
      valToPetname.init(val, petname);
    };
    const deletePetname = petname => {
      assert(
        petnameToVal.has(petname),
        details`petname ${q(
          petname,
        )} has not been previously named, would you like to add it instead?`,
      );

      // Delete the mappings.
      const val = petnameToVal.get(petname);
      petnameToVal.delete(petname);
      valToPetname.delete(val);
    };
    const mapping = harden({
      valToPetname,
      petnameToVal,
      addPetname,
      renamePetname,
      deletePetname,
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
    // Val was not found in any named petname map. It may be in
    // unnamedMapping already.
    if (unnamedMapping.valToPetname.has(val)) {
      return harden({
        kind: 'unnamed',
        petname: unnamedMapping.valToPetname.get(val),
      });
    }
    // Val was not found anywhere, so we need to add it.
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
