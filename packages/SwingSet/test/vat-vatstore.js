import { Far } from '@endo/marshal';

export const buildRootObject = vatPowers => {
  const vatstore = vatPowers.vatstore;
  const log = vatPowers.testLog;

  return Far('root', {
    bootstrap: _vats => {},
    get: key => {
      const value = vatstore.get(key);
      if (value) {
        log(`get ${key} -> "${value}"`);
      } else {
        log(`get ${key} -> <undefined>`);
      }
      return value;
    },
    store: (key, value) => {
      vatstore.set(key, value);
      log(`store ${key} <- "${value}"`);
    },
    getAfter: (priorKey, lowerBound, upperBound) => {
      const result = vatstore.getAfter(priorKey, lowerBound, upperBound);
      const [key, value] = result;
      log(
        `getAfter ${priorKey} ${lowerBound} ${upperBound} -> [${key}, ${value}]`,
      );
      return result;
    },
    scan: (prefix, threshold) => {
      if (threshold) {
        log(`scan ${prefix} ${threshold}:`);
      } else {
        log(`scan ${prefix}:`);
      }
      try {
        let count = 0;
        let [key, value] = vatstore.getAfter('', prefix);
        while (key) {
          count += 1;
          log(`    ${key} -> ${value}`);
          if (threshold && count === threshold) {
            log('    interrupting...');
            vatstore.set('temp', '42');
          }
          [key, value] = vatstore.getAfter(key, prefix);
        }
      } catch (e) {
        log(`    failure ${e}`);
      }
    },
    scanRange: (lower, upper) => {
      log(`scanRange ${lower} ${upper}:`);
      let key = '';
      let value;
      [key, value] = vatstore.getAfter(key, lower, upper);
      while (key) {
        log(`    ${key} -> ${value}`);
        [key, value] = vatstore.getAfter(key, lower, upper);
      }
    },
    scanInterleaved: (prefix1, prefix2) => {
      log(`scanInterleaved ${prefix1} ${prefix2}:`);
      let done1 = false;
      let done2 = false;
      let key1 = '';
      let value1;
      let key2 = '';
      let value2;
      do {
        if (!done1) {
          [key1, value1] = vatstore.getAfter(key1, prefix1);
          if (key1) {
            log(`    1: ${key1} -> ${value1}`);
          } else {
            done1 = true;
          }
        }
        if (!done2) {
          [key2, value2] = vatstore.getAfter(key2, prefix2);
          if (key2) {
            log(`    2: ${key2} -> ${value2}`);
          } else {
            done2 = true;
          }
        }
      } while (!done1 || !done2);
    },
    apiAbuse: prefix => {
      log(`apiAbuse ${prefix}: use prefix as prior key (should work)`);
      const [key1, value1] = vatstore.getAfter(prefix, prefix);
      if (key1) {
        log(`  ${key1} -> ${value1}`);
      } else {
        log(`  getAfter(${prefix}, ${prefix}) returns undefined`);
      }

      const badPriorKey = `aaa${prefix}`;
      log(`apiAbuse ${prefix}: use out of range prior key ${badPriorKey}`);
      try {
        const [key2, value2] = vatstore.getAfter(badPriorKey, prefix);
        if (key2) {
          log(`  ${key2} -> ${value2}`);
        } else {
          log(`  getAfter(${badPriorKey}, ${prefix}) returns undefined`);
        }
      } catch (e) {
        log(`  getAfter(${badPriorKey}, ${prefix}) threw ${e}`);
      }

      log(`apiAbuse ${prefix}: use invalid key prefix`);
      try {
        const [key3, value3] = vatstore.getAfter('', 'ab@%%$#');
        if (key3) {
          log(`  ${key3} -> ${value3}`);
        } else {
          log(`  getAfter("", "ab@%%$#") returns undefined`);
        }
      } catch (e) {
        log(`  getAfter("", "ab@%%$#") threw ${e}`);
      }
    },
    scanWithActivity: (prefix, delThreshold, toDel, addThreshold, toAdd) => {
      log(
        `scanWithActivity ${prefix} ${delThreshold} ${toDel} ${addThreshold} ${toAdd}`,
      );
      let count = 0;
      let [key, value] = vatstore.getAfter('', prefix);
      while (key) {
        count += 1;
        log(`    ${key} -> ${value}`);
        if (count === delThreshold) {
          vatstore.delete(toDel);
        } else if (count === addThreshold) {
          vatstore.set(toAdd, 'whacka whacka');
        }
        [key, value] = vatstore.getAfter(key, prefix);
      }
    },
    delete: key => {
      vatstore.delete(key);
      log(`delete ${key}`);
    },
  });
};
