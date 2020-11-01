import { makePluginManager } from '@agoric/swingset-vat/src/vats/plugin-manager';

export function buildRootObject(vatPowers) {
  return harden({
    makePluginManager(pluginDevice) {
      return makePluginManager(pluginDevice, vatPowers);
    },
  });
}
