// Copyright (C) 2019 Agoric, under Apache License 2.0

import { generateSparseInts } from '@agoric/sparse-ints';
import { assert, details as X } from '@agoric/assert';

// TODO(https://github.com/Agoric/agoric-sdk/issues/827), rename internally to
//  match teh way it's now published.
// Example REPL invocations
// home.registry~.register('sharing', home.sharingService)
// for (let i = 0; i < 3000; i++) { home.registry~.register('sharing', home.sharingService); }

const minimumDigits = 4;

// Generated keys must end with _ and digits.
const keyFormat = new RegExp(`.*_\\d{${minimumDigits},}$`);

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
      const depth = Math.max(
        minimumDigits,
        Math.floor(Math.log10(useCount) + 1.6),
      );

      // Retry until we have a unique key.
      let key;
      do {
        const uniqueString = sparseInts.next().value.toString();
        const keyString = uniqueString.slice(-depth).padStart(depth, '0');
        // console.log(`RAND ${useCount} ${uniqueString} ${keyString}`);
        key = `${realName}_${keyString}`;
      } while (contents.has(key));

      contents.set(key, harden(value));
      return key;
    },
    get(key, version = null) {
      assert.typeof(key, 'string', X`Key must be string ${key}`);
      assert(keyFormat.test(key), X`Key must end with _<digits> ${key}`);
      if (version) {
        assert.equal(
          version,
          systemVersion,
          X`Key is from incompatible version: ${version} should be ${systemVersion}`,
        );
      }
      return contents.get(key);
    },
    keys() {
      return harden([...contents.keys()]);
    },
  });

  return registrar;
}

export { makeRegistrar };
