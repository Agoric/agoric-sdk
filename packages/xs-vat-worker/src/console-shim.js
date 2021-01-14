const noop = _ => undefined;

globalThis.console = {
  debug: noop,
  log: noop,
  info: noop,
  warn: noop,
  error: noop,
};
