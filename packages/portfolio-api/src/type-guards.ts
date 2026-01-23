import type { InstrumentId } from './instruments.js';
import type { LocalChainAccountRef, InterChainAccountRef } from './types.js';

/**
 * Without regard to supported chains, is the input plausibly a
 * LocalChainAccountRef (i.e., does it start with `+`)?
 */
export const isLocalChainAccountRef = (
  ref: string,
): ref is LocalChainAccountRef => ref.startsWith('+');
harden(isLocalChainAccountRef);

/**
 * Without regard to supported chains, is the input plausibly an
 * InterChainAccountRef (i.e., does it start with `@`)?
 */
export const isInterChainAccountRef = (
  ref: string,
): ref is InterChainAccountRef => ref.startsWith('@');
harden(isInterChainAccountRef);

/**
 * Without regard to supported chains, is the input plausibly an InstrumentId
 * (i.e., does it start with an ASCII letter)?
 */
export const isInstrumentId = (ref: string): ref is InstrumentId =>
  !!ref.match(/^[a-z]/i);
harden(isInstrumentId);

/**
 * Is the input an ERC-4626 InstrumentId
 * (i.e., does it start with 'ERC4626_')?
 */
export const isERC4626InstrumentId = (ref: string): boolean =>
  ref.startsWith('ERC4626_');
harden(isERC4626InstrumentId);
