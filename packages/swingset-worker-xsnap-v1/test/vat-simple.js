import { Far } from '@endo/marshal';

export function buildRootObject() {
  console.log(`--vat: in buildRootObject`);
  return Far('root', {
    ping: () => {
      console.log(`--vat: in ping`);
      return 'pong';
    },
  });
}
