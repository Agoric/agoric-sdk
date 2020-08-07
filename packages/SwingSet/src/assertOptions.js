import { assert } from '@agoric/assert';

export function assertKnownOptions(options, knownNames) {
  assert(knownNames instanceof Array);
  for (const name of Object.keys(options)) {
    if (knownNames.indexOf(name) === -1) {
      throw Error(`unknown option ${name}`);
    }
  }
}
