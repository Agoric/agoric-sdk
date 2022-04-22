// @ts-check
import { initSwingStore } from '@agoric/swing-store';

/*
The "Storage API" is a set of functions { has, getKeys, get, set, delete } that
work on string keys and accept string values.  A lot of kernel-side code
expects to get an object which implements the Storage API, which is usually
associated with a write-back buffer wrapper.

A more sophisticated host will build a hostDB that writes changes to disk
directly.
*/

/**
 * Helper function to initialize an ephemeral storage used as fallback or for tests
 */
export function provideHostStorage() {
  const swingStore = initSwingStore(null);
  return {
    kvStore: swingStore.kvStore,
    streamStore: swingStore.streamStore,
  };
}
