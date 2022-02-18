/* global globalThis endow1 */

import { bundle2Add, bundle2Transform, bundle2ReadGlobal } from './bundle2.js';

// invocation
export const f1 = a => a + 1;

// nested module invocation
export const f2 = a => bundle2Add(a);

// endowments
export const f3 = a => a + endow1;

// transforms
export const f4 = a => `replaceme ${a}`;

// nested module transforms
export const f5 = a => `Mr. Lambert says ${bundle2Transform(a)}`;

// globalThis should not hardened, and not available as a channel between
// unrelated code

export const f6ReadGlobal = () => globalThis.sneakyChannel;

export const f7ReadGlobalSubmodule = () => bundle2ReadGlobal();
