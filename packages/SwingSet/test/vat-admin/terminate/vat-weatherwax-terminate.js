import { makePromiseKit } from '@endo/promise-kit';
import { Far } from '@endo/far';

export function buildRootObject(vatPowers) {
  // we use testLog to attempt to deliver messages even after we're supposed
  // to be dead and gone
  const { testLog } = vatPowers;
  let resolvers;

  return Far('root', {
    live() {
      testLog(`w: I ate'nt dead`);
      if (resolvers && resolvers.length) {
        resolvers.shift()('I so resolve');
      }
    },
    rememberThese(p1, p2) {
      p1.then(v => testLog(`w: p1 = ${v}`));
      p2.then(v => testLog(`w: p2 = ${v}`));
      const { promise: pBefore, resolve: rBefore } = makePromiseKit();
      const { promise: pAfter, resolve: rAfter } = makePromiseKit();
      resolvers = [rBefore, rAfter];
      return [pBefore, pAfter];
    },
  });
}
