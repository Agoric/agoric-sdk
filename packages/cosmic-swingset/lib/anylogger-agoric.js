import anylogger from 'anylogger';

// Turn on debugging output with DEBUG=agoric

const debugging = process.env.DEBUG && process.env.DEBUG.includes('agoric');
const defaultLevel = debugging ? anylogger.levels.debug : anylogger.levels.info;

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
      const doLog = l[level] || (() => {});
      l[level] = (...args) => doLog(`${prefix}:`, ...args);
    }
  }
  return l;
};
