import harden from '@agoric/harden';

import makePromise from './makePromise';

// TODO Reconcile with spec of Promise.allSettled
function allSettled(promises) {
  promises = [...promises];
  const len = promises.length;
  if (len === 0) {
    return [];
  }
  const result = makePromise();
  const list = [];
  let count = len;
  for (let i = 0; i < len; i += 1) {
    Promise.resolve(promises[i]).then(
      v => {
        list[i] = v;
        count -= 1;
        if (count === 0) {
          result.res(list);
        }
      },
      _ => {
        list[i] = promises[i];
        count -= 1;
        if (count === 0) {
          result.res(list);
        }
      },
    );
  }
  return result.p;
}
harden(allSettled);

export { allSettled };
