// Copyright (C) 2019 Agoric, under Apache License 2.0

import { Fail } from '@agoric/assert';
import { Far } from '@endo/far';

// Allows multiple parties to store values for retrieval by others.
function makeSharedMap(name) {
  const namedEntries = new Map();
  const orderedEntries = [];

  return Far('sharedMap', {
    lookup(propertyName) {
      if (!namedEntries.has(propertyName)) {
        return undefined;
      }
      return namedEntries.get(propertyName)[0];
    },
    addEntry(key, value) {
      !namedEntries.has(key) ||
        Fail`SharedMap ${name} already has an entry for ${key}.`;
      orderedEntries.push([key, value]);
      namedEntries.set(key, [value, orderedEntries.length]);
      return orderedEntries.length;
    },
    getName() {
      return name;
    },
    // TODO(hibbert) retrieve by numbered position
  });
}
harden(makeSharedMap);

export { makeSharedMap };
