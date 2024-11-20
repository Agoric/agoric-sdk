/* global globalThis */
const makeRecorder = obj => {
  /** @type {{ thisArg: object, func?: (...args: any[]) => any, method?: PropertyKey, args: any[] }[] | undefined} */
  let recording;
  const proxy = new Proxy(obj, {
    get(target, p, receiver) {
      const v = Reflect.get(target, p, receiver);
      if (typeof v === 'function') {
        return {
          [p](...args) {
            if (recording) recording.push({ thisArg: target, method: p, args });
            return Reflect.apply(v, target, args);
          },
        }[/** @type {string} */ (p)];
      }
      return v;
    },
    apply(target, thisArg, args) {
      if (recording) recording.push({ thisArg, func: target, args });
      return Reflect.apply(target, thisArg, args);
    },
  });

  const recorder = {
    /**
     * Remove and return all existing recording entries.
     */
    flush() {
      const recorded = recording;
      if (recording) recording = [];
      return recorded;
    },
    /**
     * Ensure the recorder is currently recording.
     */
    go() {
      if (!recording) recording = [];
    },
    /**
     * Return the current recording entries without removing them.
     */
    peek() {
      return recording;
    },
    /**
     * Stop recording and return all existing recording entries.
     */
    stop() {
      const recorded = recording;
      recording = undefined;
      return recorded;
    },
  };
  return { proxy, recorder };
};

export const originalConsole = globalThis.console;
const { recorder: consoleRecorder, proxy } = makeRecorder(originalConsole);
globalThis.console = proxy;
export { consoleRecorder };
