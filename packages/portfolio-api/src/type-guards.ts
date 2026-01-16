import type { InstrumentId } from './instruments.js';
import type {
  DepositFromChainRef,
  LocalChainAccountRef,
  InterChainAccountRef,
  WithdrawToChainRef,
} from './types.js';

/**
 * Without regard to supported chains, is the input plausibly a
 * DepositFromChainRef (i.e., does it start with `+`)?
 */
export const isDepositFromChainRef = (
  ref: string,
): ref is DepositFromChainRef => ref.startsWith('+');
harden(isDepositFromChainRef);

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
 * Without regard to supported chains, is the input plausibly a
 * WithdrawToChainRef (i.e., does it start with `-`)?
 */
export const isWithdrawToChainRef = (ref: string): ref is WithdrawToChainRef =>
  ref.startsWith('-');
harden(isWithdrawToChainRef);
