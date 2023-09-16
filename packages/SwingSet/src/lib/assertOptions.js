import { assert } from '@endo/errors';
import { Fail } from '@agoric/internal';

export function assertKnownOptions(options, knownNames) {
  assert(knownNames instanceof Array);
  for (const name of Object.keys(options)) {
    knownNames.indexOf(name) !== -1 || Fail`unknown option ${name}`;
  }
}
