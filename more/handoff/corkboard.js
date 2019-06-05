// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

// Allows multiple parties to store values for retrieval by others.
function makeCorkboard(name) {
  const namedEntries = new Map();
  const orderedEntries = [];

  return harden({
    lookup(propertyName) {
      if (!namedEntries.has(propertyName)) {
        return undefined;
      }
      return namedEntries.get(propertyName)[0];
    },
    addEntry(key, value) {
      if (namedEntries.has(key)) {
        throw new Error(`Corkboard ${name} already has an entry for ${key}.`);
      }
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
harden(makeCorkboard());

export { makeCorkboard };
