import { assert, Fail } from '@endo/errors';

export function assertKnownOptions(options, knownNames) {
  assert(knownNames instanceof Array);
  for (const name of Object.keys(options)) {
    knownNames.indexOf(name) !== -1 || Fail`unknown option ${name}`;
  }
}
