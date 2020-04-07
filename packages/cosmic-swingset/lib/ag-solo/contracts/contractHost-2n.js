import harden from '@agoric/harden';
import { producePromise } from '@agoric/produce-promise';

export default harden((_terms, inviteMaker) => {
  const result = producePromise();
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
