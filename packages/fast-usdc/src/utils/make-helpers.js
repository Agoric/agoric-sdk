/**
 * Takes an object of make* functions and returns an object with a single 'make' property
 * containing those functions renamed without the 'make' prefix.
 *
 * @param {Record<string, Function>} makers - Object containing make* functions
 * @returns {{ make: Record<string, Function> }} Transformed object
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
