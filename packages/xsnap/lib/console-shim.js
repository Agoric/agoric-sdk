function tryPrint(...args) {
  try {
    // eslint-disable-next-line
    print(...args);
  } catch (err) {
    // eslint-disable-next-line
    print('cannot print:', err.message);
  }
}

const noop = _ => {};

/**
 * Since SES expects (requires?) a console,
 * provide one based on xsnap's print.
 * Note that this runs in the start compartment,
 * before lockdown.
 *
 * TODO: consider other methods per SES VirtualConsole.
 * See https://github.com/Agoric/agoric-sdk/issues/2146
 */
const console = {
  debug: tryPrint,
  log: tryPrint,
  info: tryPrint,
  warn: tryPrint,
  error: tryPrint,

  group: noop,
  groupCollapsed: noop,
  groupEnd: noop,
};

globalThis.console = console;
