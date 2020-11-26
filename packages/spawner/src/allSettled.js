import { makePromiseKit } from '@agoric/promise-kit';

// TODO Reconcile with spec of Promise.allSettled
function allSettled(promises) {
  promises = [...promises];
  const len = promises.length;
  if (len === 0) {
    return [];
  }
  const result = makePromiseKit();
  const list = [];
  let count = len;
  for (let i = 0; i < len; i += 1) {
    Promise.resolve(promises[i]).then(
      v => {
        list[i] = v;
        count -= 1;
        if (count === 0) {
          result.resolve(list);
        }
      },
      _ => {
        list[i] = promises[i];
        count -= 1;
        if (count === 0) {
          result.resolve(list);
        }
      },
    );
  }
  return result.promise;
}
harden(allSettled);

export { allSettled };
