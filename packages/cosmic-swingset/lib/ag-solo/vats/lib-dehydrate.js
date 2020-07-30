// @ts-check
/* global harden */

import { makeMarshal } from '@agoric/marshal';
import makeStore from '@agoric/store';
import { assert, details, q } from '@agoric/assert';

/**
 * @typedef {string[]} Edgename
 * @param {any} x
 * @returns {x is Edgename}
 */
export const isEdgename = x => {
  if (!Array.isArray(x)) {
    return false;
  }
  for (const name of x) {
    if (typeof name !== 'string') {
      return false;
    }
  }
  return true;
};

// Marshalling for the UI should only use the user's petnames. We will
// call marshalling for the UI "dehydration" and "hydration" to distinguish it from
// other marshalling.
export const makeDehydrator = (initialUnnamedCount = 0) => {
  let unnamedCount = initialUnnamedCount;

  const petnameKindToMapping = makeStore('petnameKind');

  /** @type {string[]} */
  const searchOrder = [];

  // Edgenames are kept across all kinds.
  /** @type {Store<string, Edgename[]>} */
  const valToEdgenames = makeStore('value');

  /**
   * @typedef {Store<string, [Edgename | undefined, any]>} StrongnameToEdgename
   * @type {StrongnameToEdgename}
   */
  const strongnameToEdgename = makeStore('name');

  const makeMapping = kind => {
    assert.typeof(kind, 'string', details`kind ${kind} must be a string`);
    /** @type {Store<any, string | Edgename>} */
    const valToPetname = makeStore('value');
    /** @type {Store<Edgename | string, any>} */
    const petnameToVal = makeStore('petname');
    const addPetname = (petname, val) => {
      assert(
        !petnameToVal.has(petname),
        details`petname ${petname} is already in use`,
      );
      assert(
        !valToPetname.has(val),
        details`val ${val} already has a strong name`,
      );
      petnameToVal.init(petname, val);
      valToPetname.init(val, petname);
      if (!valToEdgenames.has(val)) {
        valToEdgenames.init(val, harden([]));
      }
    };

    /**
     * @param {Edgename} edgename
     * @param {any} val
     */
    const addEdgename = (edgename, val) => {
      assert(
        isEdgename(edgename),
        details`edgename ${q(edgename)} must be an array of strings`,
      );

      // Check that the edgename is not used anywhere.
      const explode = [...edgename];
      let store = strongnameToEdgename;
      let name = explode.shift();
      while (name !== undefined) {
        /** @type {[Edgename | undefined, StrongnameToEdgename]} */
        let ent;
        if (store.has(name)) {
          ent = store.get(name);
        } else {
          ent = [undefined, makeStore('name')];
          store.init(name, ent);
        }

        if (!explode.length) {
          assert(
            ent[0] === undefined,
            details`edgename ${q(edgename)} is already in use`,
          );
          // Save the canonical edgename.
          ent[0] = edgename;
        }

        store.set(name, ent);

        // eslint-disable-next-line prefer-destructuring
        store = ent[1];
        name = explode.shift();
      }

      if (
        !valToPetname.has(val) &&
        // eslint-disable-next-line no-use-before-define
        rootEdgeMapping.valToPetname.has(edgename[0])
      ) {
        // We have a petname for the root of the edgename, so use it as our strongname.
        valToPetname.init(val, edgename);
      }

      // Check all the extant edgenames for this value.
      const edgenames = valToEdgenames.has(val)
        ? valToEdgenames.get(val)
        : harden([]);

      // See if we already have the edgename in the list.
      const found = edgenames.find(ename => {
        if (ename.length !== edgename.length) {
          return false;
        }
        for (let i = 0; i < ename.length; i += 1) {
          if (ename[i] !== edgename[i]) {
            return false;
          }
        }
        return true;
      });

      // Set the new edgename if not found.
      if (!found) {
        valToEdgenames.set(val, harden([...edgenames, edgename]));
      }
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
      if (!isEdgename(oldPetname)) {
        petnameToVal.delete(oldPetname);
      }
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
      valToEdgenames,
      petnameToVal,
      addPetname,
      addEdgename,
      renamePetname,
      deletePetname,
      kind,
    });
    petnameKindToMapping.init(kind, mapping);
    return mapping;
  };

  const rootEdgeMapping = makeMapping('rootEdge');
  const unnamedMapping = makeMapping('unnamed');

  const addToUnnamed = val => {
    unnamedCount += 1;
    const placeholder = `unnamed-${unnamedCount}`;
    unnamedMapping.addPetname(placeholder, val);
    const placeholderName = harden({
      kind: 'unnamed',
      petname: placeholder,
    });
    return placeholderName;
  };

  // look through the petname stores in order and create a new
  // unnamed record if not found.
  const convertValToName = val => {
    for (let i = 0; i < searchOrder.length; i += 1) {
      const kind = searchOrder[i];
      const { valToPetname } = petnameKindToMapping.get(kind);
      if (valToPetname.has(val)) {
        const strongname = valToPetname.get(val);
        if (!isEdgename(strongname)) {
          // It's a user-assigned petname.
          return harden({
            kind,
            petname: strongname,
          });
        }

        const [rootName, ...rest] = strongname;
        if (rootEdgeMapping.valToPetname.has(rootName)) {
          // It's an edgename whose root has a petname.
          const rootPetname = rootEdgeMapping.valToPetname.get(rootName);
          assert(!isEdgename(rootPetname));

          const petname = [rootPetname, ...rest].join('.');

          // Just as strong as a petname, but still has context.
          return harden({
            kind,
            petname,
          });
        }
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

  const canonicalizeStrongname = strongname => {
    if (!isEdgename(strongname)) {
      return strongname;
    }

    // A strong edgename must have a root name we have mapped.
    const explode = [...strongname];
    const { petnameToVal: rootNameToVal } = rootEdgeMapping;
    explode[0] = rootNameToVal.get(strongname[0]);

    let name = explode.shift();
    /** @type {[Edgename | undefined, StrongnameToEdgename]} */
    let ent = [undefined, strongnameToEdgename];
    while (name !== undefined) {
      const store = ent[1];
      assert(store.has(name), details`edgename component ${name} not found`);
      ent = store.get(name);
      name = explode.shift();
    }
    return ent[0];
  };

  const convertNameToVal = ({ kind, petname }) => {
    const { petnameToVal } = petnameKindToMapping.get(kind);
    return petnameToVal.get(canonicalizeStrongname(petname));
  };

  const { serialize: dehydrate, unserialize: hydrate } = makeMarshal(
    convertValToName,
    convertNameToVal,
  );
  return harden({
    hydrate,
    dehydrate,
    canonicalizeStrongname,
    getEdgenameMappings() {
      return [rootEdgeMapping];
    },
    makeMapping: kind => {
      const mapping = makeMapping(kind);
      searchOrder.push(kind);
      return mapping;
    },
  });
};
