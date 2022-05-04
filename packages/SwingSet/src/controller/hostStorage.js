// @ts-check
import { initSwingStore } from '@agoric/swing-store';

/*
StorageAPI is a set of functions { has, getKeys, get, set, delete }
that work on string keys and accept string values
(cf. packages/SwingSet/docs/state.md#transactions). A lot of kernel-side
code expects to get a StorageAPI object, which is usually associated with
a write-back buffer wrapper.

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
