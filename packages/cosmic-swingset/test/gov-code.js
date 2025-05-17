/* global E */
/// <reference types="@agoric/vats/src/core/core-eval-env" />
/**
 * This file, along with the companion `gov-permit.json`, are used to test "big
 * hammer" chain governance.  They don't have a functional purpose outside of
 * that testing.
 */

// Demonstrate that a console is available.
console.info('hello from the governed code!');

// Extract our permitted powers from the `powers` argument.
const behavior = ({ consume: { client } }) => {
  // Assign the address of the governed code to the `youAreGoverned` property in
  // clients' `home`.
  E(client).assignBundle([addr => ({ youAreGoverned: addr })]);
};

`import('foo')`;

// "export" our behavior by way of the completion value of this script.
behavior;
