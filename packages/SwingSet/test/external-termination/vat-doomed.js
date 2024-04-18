import { Far } from '@endo/far';

export function buildRootObject() {
  return Far('doomed', {
    ping: count => count,
  });
}
