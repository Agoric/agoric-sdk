// Allow the React dev environment to extend the console for debugging
// features.
// eslint-disable-next-line no-constant-condition
const consoleTaming = '%NODE_ENV%' === 'production' ? 'safe' : 'unsafe';

// eslint-disable-next-line no-restricted-properties
const { pow: mathPow } = Math;
// eslint-disable-next-line no-restricted-properties
Math.pow = (base, exp) =>
  typeof base === 'bigint' && typeof exp === 'bigint'
    ? base ** exp
    : mathPow(base, exp);

lockdown({
  __allowUnsafeMonkeyPatching__: 'unsafe',
  errorTaming: 'unsafe',
  overrideTaming: 'severe',
  consoleTaming,
});

console.log('lockdown done.');

window.addEventListener('unhandledrejection', ev => {
  ev.stopImmediatePropagation();
});
