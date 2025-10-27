import type { InterChainAccountRef, LocalChainAccountRef } from './types.js';

/**
 * Does it match the pattern, without regard to supported chains.
 */
export const isLocalChainAccountRef = (
  ref: string,
): ref is LocalChainAccountRef => ref.startsWith('+');
harden(isLocalChainAccountRef);

/**
 * Does it match the pattern, without regard to supported chains.
 */
export const isInterChainAccountRef = (
  ref: string,
): ref is InterChainAccountRef => ref.startsWith('@');
harden(isInterChainAccountRef);
