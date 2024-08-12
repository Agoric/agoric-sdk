/**
 * @file Module with linting errors, to verify the linting config detects them.
 *   This assumes `reportUnusedDisableDirectives` is enabled in the local
 *   config.
 */

// TODO error on exports that:
// - don't satisfy orchestration flow type

// eslint-disable-next-line no-restricted-syntax -- intentional for test
import { E } from '@endo/far';

// eslint-disable-next-line @endo/harden-exports -- intentional for test
export function unhardenable() {
  console.log('hardening on function keyword is not safe due to hoisting');
}
harden(unhardenable);

export const notFlow = () => {
  console.log('This function is not a flow');
};
harden(notFlow);

// eslint-disable-next-line @endo/harden-exports -- intentional for test
export async function notHardened() {
  console.log('This function is the most minimal flow, but it’s not hardened');
}

export const usesE = async (orch, { someEref }) => {
  // eslint-disable-next-line no-restricted-syntax -- intentional for test
  await E(someEref).foo();
};
harden(usesE);
