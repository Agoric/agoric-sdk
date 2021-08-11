/* global makeKind makeVirtualScalarWeakMap */

const start = _zcf => {
  makeKind();
  makeVirtualScalarWeakMap();

  return harden({});
};
harden(start);
export { start };
