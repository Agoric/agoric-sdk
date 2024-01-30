import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { prepareWhenableModule } from './src/module.js';

export const { E, makeWhenableKit, makeWhenablePromiseKit, when, watch } =
  prepareWhenableModule(makeHeapZone());
