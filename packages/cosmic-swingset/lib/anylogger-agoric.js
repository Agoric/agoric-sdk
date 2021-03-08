/* global process */
import anylogger from 'anylogger';

// Turn on debugging output with DEBUG=agoric

let debugging;
if (process.env.DEBUG === undefined) {
  // DEBUG not set, default to log level.
  debugging = 'log';
} else if (process.env.DEBUG.includes('agoric')) {
  // DEBUG set and we're enabled; verbose.
  debugging = 'debug';
} else {
  // DEBUG set but we're not enabled; quieter than normal.
  debugging = 'info';
}
const defaultLevel = anylogger.levels[debugging];

const oldExt = anylogger.ext;
anylogger.ext = (l, o) => {
  l = oldExt(l, o);
  l.enabledFor = lvl => defaultLevel >= anylogger.levels[lvl];

  const prefix = l.name.replace(/:/g, ': ');
  for (const [level, code] of Object.entries(anylogger.levels)) {
    if (code > defaultLevel) {
      // Disable printing.
      l[level] = () => {};
    } else {
      // Enable the printing with a prefix.
      const doLog = l[level];
      if (doLog) {
        l[level] = (...args) => {
          // Add a timestamp.
          const now = new Date().toISOString();
          doLog(`${now} ${prefix}:`, ...args);
        };
      } else {
        l[level] = () => {};
      }
    }
  }
  return l;
};
