/* eslint max-classes-per-file:OFF */
// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { makePrivateName } from './PrivateName';
import { insist } from './insist';

// Maps from EMaps to encapsulated Maps. All lookups from this table
// are only queries. (Except for the one in the FlexMap constructor)
const hiddenEMap = makePrivateName();

// Abstract superclass with query-only methods.
class EMap {
  constructor(optIterable = undefined) {
    insist(new.target !== EMap)`\
EMap is abstract`;
    const newHidden = new Map(optIterable);
    hiddenEMap.init(this, newHidden);
  }

  snapshot() {
    // copy
    // eslint-disable-next-line no-use-before-define
    return new FixedMap(hiddenEMap.get(this));
  }

  diverge() {
    // copy
    // eslint-disable-next-line no-use-before-define
    return new FlexMap(hiddenEMap.get(this));
  }

  readOnlyView() {
    // eslint-disable-next-line no-use-before-define
    const result = new InternalReadOnlyMap();
    // Share the hidden map itself, but the readOnlyView only grants
    // the ability to query it.
    hiddenEMap.init(result, hiddenEMap.get(this));
    return result;
  }

  // Forward query protocol from Map

  keys() {
    return hiddenEMap.get(this).keys();
  }

  values() {
    return hiddenEMap.get(this).values();
  }

  entries() {
    return hiddenEMap.get(this).entries();
  }

  [Symbol.iterator]() {
    return hiddenEMap.get(this)[Symbol.iterator]();
  }

  forEach(callback) {
    return hiddenEMap.get(this).forEach(callback);
  }

  get(member) {
    return hiddenEMap.get(this).get(member);
  }

  has(member) {
    return hiddenEMap.get(this).has(member);
  }

  get size() {
    return hiddenEMap.get(this).size;
  }
}
harden(EMap);

// Guarantees that the map contents is stable.
// TODO: Somehow arrange for this to be pass-by-copy-ish.
class FixedMap extends EMap {
  constructor(optIterable = undefined) {
    insist(new.target === FixedMap)`\
FixedMap is final`;
    super(optIterable);
    harden(this);
  }

  // override
  snapshot() {
    return this;
  }

  // override
  readOnlyView() {
    return this;
  }
}
harden(FixedMap);

// Maps from FlexMaps to encapsulated Maps, a subset of
// hiddenEMap. Lookups from this table can mutate.
const hiddenFlexMap = makePrivateName();

// Supports mutation.
class FlexMap extends EMap {
  constructor(optIterable = undefined) {
    insist(new.target === FlexMap)`\
FlexMap is final`;
    super(optIterable);
    // Be very scared of the following line, since it looks up on
    // hiddenEMap for purposes of enabling mutation. We assume it is
    // safe because the `new.target` insist check above ensures this
    // constructor is being called as-if directly with `new`. We say
    // "as-if" because it might be invoked by `Reflect.construct`, but
    // only in an equivalent manner.
    hiddenFlexMap.init(this, hiddenEMap.get(this));
    harden(this);
  }

  // Like snapshot() except that this FlexMap loses ownership and
  // becomes useless.
  takeSnapshot() {
    const hiddenMap = hiddenFlexMap.get(this);

    // Ideally we'd delete, as we would from a WeakMap. However,
    // PrivateName, to emulate class private names, has no delete.
    // hiddenFlexMap.delete(this);
    // hiddenEMap.delete(this);
    hiddenFlexMap.set(this, null);
    hiddenEMap.set(this, null);

    const result = new FixedMap();
    hiddenEMap.init(result, hiddenMap);
    return result;
  }

  // Like diverge() except that this FlexMap loses ownership and
  // becomes useless.
  takeDiverge() {
    const hiddenMap = hiddenFlexMap.get(this);

    // Ideally we'd delete, as we would from a WeakMap. However,
    // PrivateName, to emulate class private names, has no delete.
    // hiddenFlexMap.delete(this);
    // hiddenEMap.delete(this);
    hiddenFlexMap.set(this, null);
    hiddenEMap.set(this, null);

    const result = new FlexMap();
    hiddenEMap.init(result, hiddenMap);
    hiddenFlexMap.init(result, hiddenMap);
    return result;
  }

  // Forward update protocol from Map

  set(k, v) {
    return hiddenFlexMap.get(this).set(k, v);
  }

  clear() {
    return hiddenFlexMap.get(this).clear();
  }

  delete(m) {
    return hiddenFlexMap.get(this).delete(m);
  }
}
harden(FlexMap);

// The constructor for internal use only. The rest of the class is
// available from the pseudo-constructor ReadOnlyMap.
class InternalReadOnlyMap extends EMap {
  constructor() {
    super();
    harden(this);
  }

  // override
  readOnlyView() {
    return this;
  }
}

// Fake constructor becomes the public identity of the class.
// Guarantee that an instance of ReadOnlyMap does not provide the
// ability to modify.
function ReadOnlyMap() {
  insist(new.target === ReadOnlyMap)`\
ReadOnlyMap is final`;
  insist(false)`\
Use readOnlyView() to view an existing EMap`;
}
Object.setPrototypeOf(ReadOnlyMap, EMap);
ReadOnlyMap.prototype = InternalReadOnlyMap.prototype;
ReadOnlyMap.prototype.constructor = ReadOnlyMap;
harden(ReadOnlyMap);

export { EMap, FixedMap, FlexMap, ReadOnlyMap };
