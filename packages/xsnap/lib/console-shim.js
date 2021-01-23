const noop = _ => undefined;

const console = {
  debug: noop,
  log: noop,
  info: noop,
  warn: noop,
  error: noop,
  // used by SES
  group: noop,
  groupCollapsed: noop,
  groupEnd: noop,
  // others from the MDN / whatwg Console API?
  // trace, dirxml, ...
};

globalThis.console = console;
