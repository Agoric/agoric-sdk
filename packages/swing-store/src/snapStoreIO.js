import { performance } from 'node:perf_hooks';
import { makeMeasureSeconds } from '@agoric/internal';

export function makeSnapStoreIO() {
  return {
    measureSeconds: makeMeasureSeconds(performance.now.bind(performance)),
  };
}
