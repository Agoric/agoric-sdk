/* global globalThis, Compartment */

function harden(x) {
  return Object.freeze(x, true);
}

harden(harden);

globalThis.harden = harden;

function tweakCompartmentAPI(C) {
  return function Compartment(endowments, cmap, _options) {
    return new C({ harden, ...endowments }, { '*': cmap });
  };
}

globalThis.Compartment = tweakCompartmentAPI(Compartment);
