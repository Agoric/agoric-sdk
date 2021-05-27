import { Far } from '@agoric/marshal';

export function buildRootObject({ testLog }, _vatParameters) {
  const contents = [];
  function append(thing) {
    contents.push(thing);
    testLog('contents:', [...contents]);
    return harden([...contents]);
  }

  const target = Far('root', {
    append,
  });

  return target;
}
