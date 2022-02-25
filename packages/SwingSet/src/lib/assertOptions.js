import { assert, details as X } from '@agoric/assert';

export function assertKnownOptions(options, knownNames) {
  assert(knownNames instanceof Array);
  for (const name of Object.keys(options)) {
    assert(knownNames.indexOf(name) !== -1, X`unknown option ${name}`);
  }
}
