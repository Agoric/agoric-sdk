/* global E, powers */
/**
 * This file, along with the companion `gov-permit.json`, are used to test "big
 * hammer" chain governance.  They don't have a functional purpose outside of
 * that testing.
 */

// Extract our permitted powers from the global `powers` object.
const {
  consume: { client },
} = powers;

// Demonstrate that a console is available.
console.info('hello from the governed code!');

// Assign the address of the governed code to the `youAreGoverned` property in
// clients' `home`.
E(client).assignBundle([addr => ({ youAreGoverned: addr })]);
