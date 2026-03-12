import patchConsole from '@agoric/internal/src/node/patch-console.js';
import anylogger from '@agoric/internal/vendor/anylogger.js';

const log = anylogger('ymax-planner');
patchConsole((level, written) => {
  if (!log.enabledFor(level)) {
    return;
  }
  log[level](written.join('').trimEnd());
});
