// eslint-disable-next-line import/export -- just types
export type * from './types.js';

// TODO make Endo's mustMatch do this
/**
 * Returning normally indicates success. Match failure is indicated by
 * throwing.
 *
 * Note: remotables can only be matched as "remotable", not the specific kind.
 *
 * @see {endoMustMatch} for the implementation. This one has a type annotation to narrow if the pattern is a TypedPattern.
 */
export declare type MustMatch = <P extends Pattern>(
  specimen: unknown,
  pattern: P,
  label?: string | number,
) => asserts specimen is P extends TypedPattern<any> ? PatternType<P> : unknown;
