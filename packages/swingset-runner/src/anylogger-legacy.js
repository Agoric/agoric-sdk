import anylogger from '@agoric/internal/vendor/anylogger.js';

const oldExt = anylogger.ext;

/** Restore the pre-vendoring default: enabled levels log to console. */
anylogger.ext = (logger, ...rest) => {
  const extended = oldExt(logger, ...rest);
  const fallbackSink = console.log.bind(console);

  extended.enabledFor = level =>
    level !== undefined && level in anylogger.levels;
  for (const level of Object.keys(anylogger.levels)) {
    extended[level] =
      (typeof console[level] === 'function' && console[level].bind(console)) ||
      fallbackSink;
  }
  return extended;
};
