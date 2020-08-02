// ref moddable/examples/base/timers/main.js
/* global globalThis */

// eslint-disable-next-line import/no-unresolved
import Timer from 'timer'; // moddable timer

globalThis.setImmediate = callback => {
  Timer.set(callback);
};

globalThis.setTimeout = (callback, delay) => {
  Timer.set(callback, delay);
};

globalThis.setInterval = (callback, delay) => {
  Timer.repeat(callback, delay);
};
