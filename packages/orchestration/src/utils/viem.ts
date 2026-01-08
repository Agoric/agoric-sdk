/**
 * @file entry point for some common viem utils
 *
 * This file should eventually become a `.js` file once we can strip types from
 * `.ts` files and rewrite relative import specifiers in `.js` files.
 *
 * NPM consumers could use jsr.io to consume this in the meantime.
 */

export * from './viem-utils/hashTypedData.ts';
export * from './viem-utils/types.ts';
