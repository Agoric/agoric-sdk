// return an iterator of all existing keys from start (inclusive) to
// end (exclusive), in lexicographic order, calling checkF after
// each 'yield' (which can throw to break the iterator)

export function* enumerateKeysStartEnd(syscall, start, end, checkF) {
  let dbKey;
  if (syscall.vatstoreGet(start)) {
    dbKey = start;
  } else {
    dbKey = syscall.vatstoreGetNextKey(start); // maybe undefined
  }
  while (dbKey && dbKey < end) {
    yield dbKey;
    // REENTRANCY HAZARD: we resume here after userspace cycles
    // the iterator, so check if the generation has changed
    checkF && checkF();
    // fetch next key (which might be past 'end'), and repeat
    dbKey = syscall.vatstoreGetNextKey(dbKey);
  }
}
harden(enumerateKeysStartEnd);

// return an iterator of all existing keys that start with 'prefix'
// (excluding the prefix itself)

export function* enumerateKeysWithPrefix(syscall, prefix) {
  let key = prefix;
  while (true) {
    key = syscall.vatstoreGetNextKey(key);
    if (!key || !key.startsWith(prefix)) {
      break;
    }
    yield key;
  }
}
harden(enumerateKeysWithPrefix);

export function prefixedKeysExist(syscall, prefix) {
  const nextKey = syscall.vatstoreGetNextKey(prefix);
  return !!(nextKey && nextKey.startsWith(prefix));
}
