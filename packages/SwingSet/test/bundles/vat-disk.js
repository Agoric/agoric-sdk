import { Far } from '@endo/marshal';

export function buildRootObject() {
  return Far('root', {
    disk() {
      return 'otech';
    },
  });
}
