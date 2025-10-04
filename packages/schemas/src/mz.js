/* eslint-disable no-underscore-dangle */
import { z } from 'zod';

export const MZ_META_KEY = '@agoric/schemas/endo';

const withMzMeta = (schema, payload) => {
  const prior = schema._def.metadata || {};
  return schema.meta({ ...prior, [MZ_META_KEY]: payload });
};

const natRefinement = (value, ctx) => {
  if (typeof value !== 'bigint' || value < 0n) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Expected a natural number',
    });
  }
};

const refineForGte = (schema, bound) => {
  if (typeof bound === 'bigint') {
    return schema.superRefine((value, ctx) => {
      if (typeof value !== 'bigint' || value < bound) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Expected bigint >= ${bound}n`,
        });
      }
    });
  }
  if (typeof bound === 'number') {
    return schema.superRefine((value, ctx) => {
      if (typeof value !== 'number' || value < bound) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Expected number >= ${bound}`,
        });
      }
    });
  }
  return schema;
};

export const Mz = harden({
  /**
   * Describe an Endo remotable pattern.
   *
   * @param {string} [label]
   */
  remotable(label) {
    return withMzMeta(z.any(), harden({ kind: 'remotable', label }));
  },

  /**
   * Matches natural numbers. Maps to `M.nat()` during compilation.
   *
   * @param {import('@endo/patterns').Limits} [limits]
   */
  nat(limits = undefined) {
    const schema = z.bigint().superRefine(natRefinement);
    return withMzMeta(schema, harden({ kind: 'nat', limits }));
  },

  /**
   * Match values greater than or equal to the given bound using `M.gte()`.
   *
   * @param {unknown} bound
   * @param {import('zod').ZodTypeAny} [base]
   */
  gte(bound, base = undefined) {
    let root = base;
    if (!root) {
      if (typeof bound === 'bigint') {
        root = z.bigint();
      } else if (typeof bound === 'number') {
        root = z.number();
      } else {
        root = z.any();
      }
    }
    const refined = refineForGte(root, bound);
    return withMzMeta(refined, harden({ kind: 'gte', bound }));
  },

  /**
   * Attach an arbitrary pattern expression so the compiler lowers it verbatim.
   *
   * @param {string} expression
   */
  raw(expression) {
    if (typeof expression !== 'string') {
      throw new TypeError('Mz.raw() expects a string expression');
    }
    return withMzMeta(z.any(), harden({ kind: 'raw', expression }));
  },
});
