// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from "@agoric/harden";
import { insist } from "../../util/insist";
import { generateSparseInts } from "../../util/sparseInts";

// Example REPL imnvocations
// home.registrar~.register('handoff', home.handoffService)
// for (let i = 0; i < 3000; i++) { home.registrar~.register('handoff', home.handoffService); }

// Generated keys must end with _ and digits.
const keyFormat = new RegExp('.*_[0-9]+');

function makeRegistrar(systemVersion, seed = 0) {
  // TODO make a better token algorithm.
  const useCounts = new Map();
  const contents = new Map();
  const sparseInts = generateSparseInts(seed);

  const registrar = harden({
    // Register the value
    register(name, value) {
      const realName = name.toLowerCase();
      const useCount = (useCounts.get(realName) || 0) + 1;
      useCounts.set(realName, useCount);
      const depth = Math.max(4, Math.floor(Math.log10(useCount) + 1.6));
      const uniqueString = sparseInts.next().value.toString();
      const keyString = uniqueString.slice(-depth).padStart(depth, '0');
      // console.log(`RAND ${useCount} ${uniqueString} ${keyString}`);
      const key = `${realName}_${keyString}`;
      // if it was a random keyString, then we need to detect collision
      insist(!contents.has(key), 'Generated name must not collide');
      contents.set(key, value);
      return key;
    },
    get(key, version = null) {
      insist(typeof key === 'string')`\
Key must be string ${key}`;
      insist(keyFormat.test(key))`\
Key must end with _<digits> ${key}`
      if (version) {
        insist(version === systemVersion)`\
Key is from incompatible version: ${version} should be ${systemVersion}`;
      }
      return contents.get(key);
    },
    keys() {
      return contents.keys();
    },
  });

  return registrar;
}

export { makeRegistrar };
