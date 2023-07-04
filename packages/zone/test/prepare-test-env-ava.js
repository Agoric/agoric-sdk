export { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeHeapZone } from '../src/heap.js';
import { makeVirtualZone } from '../src/virtual.js';
import { makeDurableZone } from '../src/durable.js';

export const makeContext = () => {
  const heapZone = makeHeapZone();
  const virtualZone = makeVirtualZone();
  const rootBaggage = virtualZone.detached().mapStore('rootBaggage');
  const rootDurableZone = makeDurableZone(rootBaggage);
  return {
    heapZone,
    virtualZone,
    rootBaggage,
    rootDurableZone,
  };
};
