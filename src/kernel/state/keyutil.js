export function* enumerateKeys(state, prefix) {
  // return [NN, key, value] for all keys that match the prefix
  for (let i = 0; true; i += 1) {
    const key = `${prefix}${i}`;
    if (Object.prototype.hasOwnProperty.call(state, key)) {
      yield [i, key, state[key]];
    } else {
      return;
    }
  }
}

export function* prefixedKeys(state, prefix) {
  for (const [, , value] of enumerateKeys(state, prefix)) {
    yield value;
  }
}

export function deletePrefixedKeys(state, prefix) {
  for (const [, key] of enumerateKeys(state, prefix)) {
    delete state[key];
  }
}

export function commaSplit(s) {
  if (s === '') {
    return [];
  }
  return s.split(',');
}
