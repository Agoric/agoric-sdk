/* global E, powers */
const {
  consume: { client },
} = powers;

console.info('hello from the governed code!');
E(client).assignBundle([addr => ({ youAreGoverned: addr })]);
