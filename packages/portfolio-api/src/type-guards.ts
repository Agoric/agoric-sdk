import type { InstrumentId } from './instruments.js';
import type { InterChainAccountRef } from './types.js';

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
