import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeKindHandle, defineDurableKind } from '@agoric/vat-data';

const provideStoredObj = (key, mapStore, makeObj) => {
  if (mapStore.has(key)) {
    return mapStore.get(key);
  } else {
    const obj = makeObj();
    mapStore.init(key, obj);
    return obj;
  }
};

const provideKindHandle = (tag, mapStore) =>
  provideStoredObj(tag, mapStore, () => makeKindHandle(tag));

export function buildRootObject(_vatPowers, vatParameters, baggage) {
  let other;
  const log = message => E(other).log(message);
  const testComplete = () => E(other).testComplete();

  const kh = provideKindHandle('testkind', baggage);
  const makeThing = defineDurableKind(kh, tag => ({ tag }), {
    getTag: ({ state }) => state.tag,
  });

  const testThing = provideStoredObj('testthing', baggage, () =>
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
