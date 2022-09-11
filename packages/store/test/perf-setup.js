/* global globalThis setTimeout print */

globalThis.console =
  globalThis.console ||
  Object.fromEntries(
    ['debug', 'log', 'info', 'warn', 'error'].map(level => [level, print]),
  );

globalThis.setImmediate = globalThis.setImmediate || (fn => setTimeout(fn, 0));

export const setupGC = async () => {
  let gc = globalThis.gc || (typeof $262 !== 'undefined' ? $262.gc : null);
  if (!gc) {
    try {
      const [{ default: v8 }, { default: vm }] = await Promise.all([
        import('v8'),
        import('vm'),
      ]);
      v8.setFlagsFromString('--expose_gc');
      gc = vm.runInNewContext('gc');
      v8.setFlagsFromString('--no-expose_gc');
    } catch (err) {
      // eslint-disable-next-line no-void
      gc = () => void Array.from({ length: 2 ** 24 }, () => Math.random());
    }
  }
  globalThis.gc = gc;
};
