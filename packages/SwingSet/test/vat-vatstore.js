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
    },
    store(key, value) {
      vatstore.set(key, value);
      log(`store ${key} <- "${value}"`);
    },
    delete(key) {
      vatstore.delete(key);
      log(`delete ${key}`);
    },
  });
}
