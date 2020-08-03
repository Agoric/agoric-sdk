// ISSUE: harden compat? https://github.com/Agoric/SES-shim/issues/104
export function harden(x) {
  return Object.freeze(x);
}

harden(harden);
globalThis.harden = harden;
