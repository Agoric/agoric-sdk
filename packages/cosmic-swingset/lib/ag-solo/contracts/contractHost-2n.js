import harden from '@agoric/harden';
import { makePromise } from '@agoric/make-promise';

export default harden((_terms, inviteMaker) => {
  const result = makePromise();
  const seat = harden({
    provide(n) {
      result.resolve(2 * n);
    },
    result() {
      return result.promise;
    },
  });
  return harden({
    seat: inviteMaker.make('multiplicand', seat),
  });
});
