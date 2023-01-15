import { Far } from '@endo/far';

export function buildRootObject(vatPowers) {
  const { testLog: log } = vatPowers;
  let count = 0;
  return Far('root', {
    count() {
      log(`count = ${count}`);
      count += 1;
    },
  });
}
