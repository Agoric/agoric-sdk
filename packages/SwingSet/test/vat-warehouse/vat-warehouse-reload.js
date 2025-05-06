import { Far } from '@endo/far';

export function buildRootObject(vatPowers, vatParameters, baggage) {
  let ephemeralCounter = 0;
  return Far('root', {
    count() {
      ephemeralCounter += 1;
      let sturdyCounter = 1;
      if (baggage.has('sturdyCounter')) {
        sturdyCounter = baggage.get('sturdyCounter') + 1;
        baggage.set('sturdyCounter', sturdyCounter);
      } else {
        sturdyCounter = 1;
        baggage.init('sturdyCounter', sturdyCounter);
      }
      vatPowers.testLog(
        `ephemeralCounter=${ephemeralCounter} sturdyCounter=${sturdyCounter}`,
      );
    },
  });
}
