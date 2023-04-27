/* global process */
import anylogger from 'anylogger';

// Turn on debugging output with DEBUG=agoric

const { DEBUG: debugEnv = '' } = process.env;
let debugging;

const filterOutPrefixes = [];
// Mute vat logging unless requested, for determinism.
if (!debugEnv.includes('SwingSet:vat')) {
  filterOutPrefixes.push('SwingSet:vat:');
}
// Mute liveSlots logging unless requested, for determinism.
if (!debugEnv.includes('SwingSet:ls')) {
  filterOutPrefixes.push('SwingSet:ls:');
}

if (process.env.DEBUG === undefined) {
  // DEBUG wasn't set, default to info level; quieter than normal.
  debugging = 'info';
} else if (debugEnv.includes('agoric')) {
  // $DEBUG set and we're enabled; loudly verbose.
  debugging = 'debug';
} else {
  // $DEBUG set but we're not enabled; slightly louder than normal.
  debugging = 'log';
}
const defaultLevel = anylogger.levels[debugging];

const oldExt = anylogger.ext;
anylogger.ext = (l, o) => {
  l = oldExt(l, o);
  l.enabledFor = lvl => defaultLevel >= anylogger.levels[lvl];

  const prefix = l.name.replace(/:/g, ': ');
  const filteredOut = filterOutPrefixes.find(pfx => l.name.startsWith(pfx));
  for (const [level, code] of Object.entries(anylogger.levels)) {
    if (filteredOut || code > defaultLevel) {
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
