// Similar to @endo/lockdown/commit-debug.js, but does not constrain
// `overrideTaming` to "min" (which is incompatible with dependency
// "json-rpc-2.0").
lockdown({
  errorTaming: 'unsafe',
  domainTaming: 'unsafe',
});
