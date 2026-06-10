import {
  defineDurableKind,
  provide,
  provideKindHandle,
} from '@agoric/vat-data';
import { E, Far } from '@endo/far';

export function buildRootObject(_vatPowers, vatParameters, baggage) {
  let other;
  const log = message => E(other).log(message);
  const testComplete = () => E(other).testComplete();

  const kh = provideKindHandle(baggage, 'testkind');
  const makeThing = defineDurableKind(kh, tag => ({ tag }), {
    getTag: ({ state }) => state.tag,
  });

  const testThing = provide(baggage, 'testthing', () =>
    makeThing('test thing'),
  );

  return Far('root', {
    runTests(testDriver, phase) {
      other = testDriver;
      log(`start test`);
      log(phase);
      if (vatParameters.mode === phase) {
        log(`fail during "${phase}"`);
      } else {
        log(testThing.getTag());
      }
      log(vatParameters);
      log(`end test`);
      testComplete();
    },
  });
}
