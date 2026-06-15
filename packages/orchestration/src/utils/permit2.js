/**
 * @file entry point for orchestration's permit2 utils
 *
 * This barrel is a `.js` file (it declares no types of its own) so consumers can
 * import `@agoric/orchestration/src/utils/permit2.js` and have it resolve to a
 * real file even under plain Node — e.g. when a packed `@agoric/*` package's
 * exports are verified/executed without a `.js`→`.ts` resolver.
 *
 * The sub-modules keep heavy TypeScript generics, so they stay `.ts`; we
 * re-export them with `.ts` specifiers, which resolve at type-check and at
 * runtime (Node strips the types).
 */

export * from './permit2/signatureTransfer.ts';
export * from './permit2/signatureTransferHelpers.ts';
