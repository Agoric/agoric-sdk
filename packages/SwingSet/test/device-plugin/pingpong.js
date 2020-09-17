export function bootPlugin() {
  return harden({
    start(opts) {
      const { prefix } = opts;
      return harden({
        ping(msg) {
          return `${prefix}${msg}`;
        },
      });
    },
  });
}
