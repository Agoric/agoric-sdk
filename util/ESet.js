/* eslint max-classes-per-file:OFF */
// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { makePrivateName } from './PrivateName';
import { insist } from './insist';

// Maps from ESets to encapsulated Sets. All lookups from this table
// are only queries. (Except for the one in the FlexSet constructor)
const hiddenESet = makePrivateName();

// Abstract superclass with query-only methods.
class ESet {
  constructor(optIterable = undefined) {
    insist(new.target !== ESet)`\
ESet is abstract`;
    const newHidden = new Set(optIterable);
    hiddenESet.init(this, newHidden);
  }

  snapshot() {
    // copy
    // eslint-disable-next-line no-use-before-define
    return new FixedSet(hiddenESet.get(this));
  }

  diverge() {
    // copy
    // eslint-disable-next-line no-use-before-define
    return new FlexSet(hiddenESet.get(this));
  }

  readOnlyView() {
    // eslint-disable-next-line no-use-before-define
    const result = new InternalReadOnlySet();
    // Share the hidden set itself, but the readOnlyView only grants
    // the ability to query it.
    hiddenESet.init(result, hiddenESet.get(this));
    return result;
  }

  // Forward query protocol from Set

  keys() {
    return hiddenESet.get(this).keys();
  }

  values() {
    return hiddenESet.get(this).values();
  }

  entries() {
    return hiddenESet.get(this).entries();
  }

  [Symbol.iterator]() {
    return hiddenESet.get(this)[Symbol.iterator]();
  }

  forEach(callback) {
    return hiddenESet.get(this).forEach(callback);
  }

  has(member) {
    return hiddenESet.get(this).has(member);
  }

  get size() {
    return hiddenESet.get(this).size;
  }
}
harden(ESet);

// Guarantees that the set contents is stable.
// TODO: Somehow arrange for this to be pass-by-copy-ish.
class FixedSet extends ESet {
  constructor(optIterable = undefined) {
    insist(new.target === FixedSet)`\
FixedSet is final`;
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
harden(FixedSet);

// Maps from FlexSets to encapsulated Sets, a subset of
// hiddenESet. Lookups from this table can mutate.
const hiddenFlexSet = makePrivateName();

// Supports mutation.
class FlexSet extends ESet {
  constructor(optIterable = undefined) {
    insist(new.target === FlexSet)`\
FlexSet is final`;
    super(optIterable);
    // Be very scared of the following line, since it looks up on
    // hiddenESet for purposes of enabling mutation. We assume it is
    // safe because the `new.target` insist check above ensures this
    // constructor is being called as-if directly with `new`. We say
    // "as-if" because it might be invoked by `Reflect.construct`, but
    // only in an equivalent manner.
    hiddenFlexSet.init(this, hiddenESet.get(this));
    harden(this);
  }

  // Like snapshot() except that this FlexSet loses ownership and
  // becomes useless.
  takeSnapshot() {
    const hiddenSet = hiddenFlexSet.get(this);

    // Ideally we'd delete, as we would from a WeakMap. However,
    // PrivateName, to emulate class private names, has no delete.
    // hiddenFlexSet.delete(this);
    // hiddenESet.delete(this);
    hiddenFlexSet.set(this, null);
    hiddenESet.set(this, null);

    const result = new FixedSet();
    hiddenESet.init(result, hiddenSet);
    return result;
  }

  // Like diverge() except that this FlexSet loses ownership and
  // becomes useless.
  takeDiverge() {
    const hiddenSet = hiddenFlexSet.get(this);

    // Ideally we'd delete, as we would from a WeakMap. However,
    // PrivateName, to emulate class private names, has no delete.
    // hiddenFlexSet.delete(this);
    // hiddenESet.delete(this);
    hiddenFlexSet.set(this, null);
    hiddenESet.set(this, null);

    const result = new FlexSet();
    hiddenESet.init(result, hiddenSet);
    hiddenFlexSet.init(result, hiddenSet);
    return result;
  }

  // Forward update protocol from Set

  add(m) {
    return hiddenFlexSet.get(this).add(m);
  }

  clear() {
    return hiddenFlexSet.get(this).clear();
  }

  delete(m) {
    return hiddenFlexSet.get(this).delete(m);
  }
}
harden(FlexSet);

// The constructor for internal use only. The rest of the class is
// available from the pseudo-constructor ReadOnlySet.
class InternalReadOnlySet extends ESet {
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
// Guarantee that an instance of ReadOnlySet does not provide the
// ability to modify.
function ReadOnlySet() {
  insist(new.target === ReadOnlySet)`\
ReadOnlySet is final`;
  insist(false)`\
Use readOnlyView() to view an existing ESet`;
}
Object.setPrototypeOf(ReadOnlySet, ESet);
ReadOnlySet.prototype = InternalReadOnlySet.prototype;
ReadOnlySet.prototype.constructor = ReadOnlySet;
harden(ReadOnlySet);

export { ESet, FixedSet, FlexSet, ReadOnlySet };
