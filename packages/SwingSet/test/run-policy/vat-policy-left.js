import { Far, E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';

export function buildRootObject() {
  let nextPK;
  function doPromise(args) {
    args[0]
      .then(doPromise)
      .catch(err => console.log(`left doPromise err`, err));
    const oldPK = nextPK;
    nextPK = makePromiseKit();
    oldPK.resolve([nextPK.promise]);
  }

  const left = Far('left', {
    doMessage(right, seqnum) {
      E(right).doMessage(left, seqnum);
    },

    startPromise(right) {
      nextPK = makePromiseKit();
      E(right)
        .startPromise([nextPK.promise])
        .then(args => {
          doPromise(args);
        })
        .catch(err => console.log(`left startPromise err`, err));
    },
  });
  return left;
}
