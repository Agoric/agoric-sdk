export * from './vat-data-bindings.js';
export * from './kind-utils.js';

// Reexporting from here to minimize breakage during transition.
// Everyone should get it directly from store rather than vat-data.
// TODO Remove once it won't break anything.
export { objectMap } from '@agoric/store';
