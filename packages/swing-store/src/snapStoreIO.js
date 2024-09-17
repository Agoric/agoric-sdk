import { makeMeasureSeconds } from '@agoric/internal';
import { performance } from 'perf_hooks';

export function makeSnapStoreIO() {
  return {
    measureSeconds: makeMeasureSeconds(performance.now.bind(performance)),
  };
}
