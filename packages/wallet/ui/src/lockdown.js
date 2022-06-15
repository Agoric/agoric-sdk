/* global process globalThis */

// Allow the React dev environment to extend the console for debugging
// features.
const consoleTaming = process.env.NODE_ENV === 'production' ? 'safe' : 'unsafe';

// eslint-disable-next-line no-restricted-properties
const { pow: mathPow } = Math;
// eslint-disable-next-line no-restricted-properties
Math.pow = (base, exp) =>
  typeof base === 'bigint' && typeof exp === 'bigint'
    ? base ** exp
    : mathPow(base, exp);

globalThis.lockdown = lockdown.bind();

lockdown({
  __allowUnsafeMonkeyPatching__: 'unsafe',
  errorTaming: 'unsafe',
  overrideTaming: 'severe',
  consoleTaming,
});

window.addEventListener('unhandledrejection', ev => {
  ev.stopImmediatePropagation();
});
