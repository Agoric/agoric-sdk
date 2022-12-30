/**
 * @file Proxy approach to enums
 *
 * Sourced from https://github.com/tc39/notes/blob/HEAD/meetings/2022-01/jan-25.md#enum-for-stage-1
 *
 */

// shared by all enums
const nameMirror = new Proxy({}, { get: (_, name) => name });

/**
 * It works like the keymirror package, but doesn't enforce its values. The
 * advantage of this is that it doesn't have to hold any state.
 *
 * Since it will mirror any value passed in, it should not be used for runtime
 * checks on the domain of the values. Instead use static type analysis to
 * confirm validity of keys.
 *
 * @template {Record<string, any>} T
 * @param {T} _map
 * @returns {{ [P in keyof T]: P }}
 */
export const makeKeyEnum = _map => nameMirror;
