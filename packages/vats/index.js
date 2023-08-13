// @ts-check
// Ambient types
import '@agoric/zoe/exported.js';
import './src/core/types.js';

// eslint-disable-next-line import/export -- no named exports
export * from './src/types.js';
export * from './src/nameHub.js';
export * from './src/bridge.js';
export { makePromiseSpace } from './src/core/promise-space.js';
export { makeAgoricNamesAccess } from './src/core/utils.js';
