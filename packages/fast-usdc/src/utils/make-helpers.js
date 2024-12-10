/**
 * Takes an object of make* functions and returns an object with a single 'make' property
 * containing those functions renamed without the 'make' prefix.
 *
 * @template {Record<`make${string}`, Function>} T
 * @param {T} makers - Object containing make* functions
 * @returns {{ make: { [K in keyof T as K extends `make${infer R}` ? R : never]: T[K] } }} Transformed object
 */
export const organizeMakers = makers => {
  const make = {};
  for (const [key, fn] of Object.entries(makers)) {
    if (key.startsWith('make')) {
      const newKey = key.slice(4); // Remove 'make'
      make[newKey] = fn;
    }
  }
  return harden({ make });
};
