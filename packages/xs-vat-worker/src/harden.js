// @ts-check

// ISSUE: harden compat? https://github.com/Agoric/SES-shim/issues/104
const { freeze: harden } = Object;

harden(harden);
globalThis.harden = harden;
