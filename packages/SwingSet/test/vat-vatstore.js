import { Far } from '@agoric/marshal';

export function buildRootObject(vatPowers) {
  const vatstore = vatPowers.vatstore;
  const log = vatPowers.testLog;

  return Far('root', {
    bootstrap(_vats) {},
    get(key) {
      const value = vatstore.get(key);
      if (value) {
        log(`get ${key} -> "${value}"`);
      } else {
        log(`get ${key} -> <undefined>`);
      }
      return value;
    },
    store(key, value) {
      vatstore.set(key, value);
      log(`store ${key} <- "${value}"`);
    },
    getAfter(keyPrefix, priorKey) {
      const result = vatstore.getAfter(keyPrefix, priorKey);
      if (result) {
        const [key, value] = result;
        log(`getAfter ${keyPrefix} ${priorKey} -> [${key}, ${value}]`);
      } else {
        log(`getAfter ${keyPrefix} ${priorKey} -> undefined`);
      }
      return result;
    },
    scan(prefix, threshold) {
      let key = '';
      let value;
      if (threshold) {
        log(`scan ${prefix} ${threshold}:`);
      } else {
        log(`scan ${prefix}:`);
      }
      let fetched;
      let count = 0;
      // eslint-disable-next-line no-cond-assign
      while ((fetched = vatstore.getAfter(prefix, key))) {
        count += 1;
        [key, value] = fetched;
        log(`    ${key} -> ${value}`);
        if (threshold && count === threshold) {
          log('    interrupting...');
          vatstore.set('temp', '42');
        }
      }
    },
    scanInterleaved(prefix1, prefix2) {
      let key1 = '';
      let key2 = '';
      let value1;
      let value2;
      log(`scanInterleaved ${prefix1} ${prefix2}:`);
      let done1 = false;
      let done2 = false;
      do {
        const fetched1 = vatstore.getAfter(prefix1, key1);
        if (fetched1 && !done1) {
          [key1, value1] = fetched1;
          log(`    1: ${key1} -> ${value1}`);
        } else {
          done1 = true;
        }
        const fetched2 = vatstore.getAfter(prefix2, key2);
        if (fetched2 && !done2) {
          [key2, value2] = fetched2;
          log(`    2: ${key2} -> ${value2}`);
        } else {
          done2 = true;
        }
      } while (!done1 || !done2);
    },
    apiAbuse(prefix) {
      log(`apiAbuse ${prefix}: use prefix as prior key (should work)`);
      const fetched1 = vatstore.getAfter(prefix, prefix);
      if (fetched1) {
        const [key, value] = fetched1;
        log(`  ${key} -> ${value}`);
      } else {
        log(`  getAfter(${prefix}, ${prefix}) returns undefined`);
      }

      const badPriorKey = `aaa${prefix}`;
      log(`apiAbuse ${prefix}: use out of range prior key ${badPriorKey}`);
      try {
        const fetched2 = vatstore.getAfter(prefix, badPriorKey);
        if (fetched2) {
          const [key, value] = fetched2;
          log(`  ${key} -> ${value}`);
        } else {
          log(`  getAfter(${prefix}, ${badPriorKey}) returns undefined`);
        }
      } catch (e) {
        log(`  getAfter(${prefix}, ${badPriorKey}) threw ${e}`);
      }

      log(`apiAbuse ${prefix}: use invalid key prefix`);
      try {
        const fetched3 = vatstore.getAfter('ab@%%$#', '');
        if (fetched3) {
          const [key, value] = fetched3;
          log(`  ${key} -> ${value}`);
        } else {
          log(`  getAfter("ab@%%$#", "") returns undefined`);
        }
      } catch (e) {
        log(`  getAfter("ab@%%$#", "") threw ${e}`);
      }
    },
    delete(key) {
      vatstore.delete(key);
      log(`delete ${key}`);
    },
  });
}
