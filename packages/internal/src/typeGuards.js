/**
 * @param {typeof import('@agoric/store').M} M
 */
export const makeTypeGuards = M =>
  harden({
    StorageNodeShape: M.remotable('StorageNode'),
  });
harden(makeTypeGuards);
