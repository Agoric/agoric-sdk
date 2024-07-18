/**
 * @file Module with linting errors, to verify the linting config detects them.
 *   This assumes `reportUnusedDisableDirectives` is enabled in the local
 *   config.
 */

// TODO error on exports that:
// - aren't hardened (probably a new rule in @endo/eslint-plugin )
// - don't satisfy orchestration flow type

// eslint-disable-next-line no-restricted-syntax -- intentional for test
import { E } from '@endo/far';

export function notFlow() {
  console.log('This function is not a flow');
}

export async function notHardened() {
  console.log('This function is the most minimal flow, but it’s not hardened');
}

export async function usesE(orch, { someEref }) {
  // eslint-disable-next-line no-restricted-syntax -- intentional for test
  await E(someEref).foo();
}
