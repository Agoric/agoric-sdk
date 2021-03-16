/* global makeKind makeWeakStore */

const start = _zcf => {
  makeKind();
  makeWeakStore();

  return harden({});
};
harden(start);
export { start };
