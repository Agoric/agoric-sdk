/* global globalThis */
export const bundle2Add = a => a + 2;

export const bundle2Transform = a => `${a} is two foot wide`;

export const bundle2ReadGlobal = () => globalThis.sneakyChannel;
