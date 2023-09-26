/** @file a valid contract before 'meta' export was introduced */

export const privateArgsShape = harden({ greeting: 'hello' });

export const prepare = () => {
  return harden({ creatorFacet: {} });
};
