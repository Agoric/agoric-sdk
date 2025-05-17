// @jessie-check

const cookie = harden({});

/**
 * Facilitate static analysis to prevent demo/test facilities from being bundled
 * in production.
 */
export const notForProductionUse = () => {
  return cookie;
};
