export function buildRootDeviceNode() {
  return harden({
    add(x, y) {
      return x + y;
    },
  });
}
