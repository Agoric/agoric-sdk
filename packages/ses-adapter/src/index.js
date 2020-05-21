/* global globalThis harden Compartment HandledPromise */

import maybeHarden from '@agoric/harden';

// ses-0.7.3 doesn't export Compartment, and when I patched it to do so
// (https://github.com/Agoric/SES-shim/pull/225), `new Compartment` throws a
// safety-check error
// import { Compartment as maybeCompartment } from 'ses'; // 'compartment-shim';

import { HandledPromise as maybeHandledPromise } from '@agoric/eventual-send';

// Use some magic to obtain 'globalThis'. Remember, under SES, we cannot
// modify globalThis.
const gt =
  typeof globalThis === 'undefined'
    ? new Function('return this')() // eslint-disable-line no-new-func
    : globalThis;

// eslint-disable-next-line no-underscore-dangle
const installed = gt.__SESAdapterInstalled || {};

let newHarden;
if (installed.harden) {
  newHarden = installed.harden;
} else if (typeof harden !== 'undefined') {
  newHarden = harden;
  installed.harden = harden;
} else {
  newHarden = maybeHarden;
  installed.harden = newHarden;
}

let newCompartment;
if (installed.Compartment) {
  newCompartment = installed.Compartment;
} else if (typeof Compartment !== 'undefined') {
  newCompartment = Compartment;
  installed.Compartment = Compartment;
} else {
  const maybeCompartment = () => {
    throw Error('non-SES Compartment still broken');
  }; // TODO
  newCompartment = maybeCompartment;
  installed.Compartment = newCompartment;
}

let newHandledPromise;
if (installed.HandledPromise) {
  newHandledPromise = installed.HandledPromise;
} else if (typeof HandledPromise !== 'undefined') {
  newHandledPromise = HandledPromise;
  installed.HandledPromise = HandledPromise;
} else {
  newHandledPromise = maybeHandledPromise;
  installed.HandledPromise = newHandledPromise;
}

try {
  // outside of SES, notify any separately-bundled copies of SES-adapter of
  // our choices, by adding a specially-named property to the global

  // eslint-disable-next-line no-underscore-dangle
  gt.__SESAdapterInstalled = installed;
} catch (e) {
  // inside SES, we ignore the failed attempt to modify the global
}

const exportHarden = newHarden;
const exportCompartment = newCompartment;
const exportHandledPromise = newHandledPromise;
export {
  exportHarden as harden,
  exportCompartment as Compartment,
  exportHandledPromise as HandledPromise,
};
