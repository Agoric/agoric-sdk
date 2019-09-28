export function insistStorageAPI(storage) {
  for (const n of ['has', 'getKeys', 'get', 'set', 'delete']) {
    if (!(n in storage)) {
      throw new Error(`storage.${n} is missing, cannot use`);
    }
  }
}

export function insistEnhancedStorageAPI(storage) {
  insistStorageAPI(storage);
  for (const n of [
    'enumeratePrefixedKeys',
    'getPrefixedValues',
    'deletePrefixedKeys',
  ]) {
    if (!(n in storage)) {
      throw new Error(`storage.${n} is missing, cannot use`);
    }
  }
}
