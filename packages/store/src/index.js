export { makeStore } from './store';
export { makeWeakStore } from './weak-store';
export { makeExternalStore } from './external/default';
export { makeMemoryExternalStore } from './external/memory';
export { makeHydrateExternalStoreMaker } from './external/hydrate';

// Backward compatibility.
export { makeStore as default } from './store';
