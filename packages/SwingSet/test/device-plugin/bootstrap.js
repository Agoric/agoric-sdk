import { E } from '@agoric/eventual-send';
import { makePluginManager } from '../../src/vats/plugin-manager';

export function buildRootObject(vatPowers, vatParameters) {
  const { D } = vatPowers;
  const log = vatPowers.testLog;
  return harden({
    async bootstrap(vats, devices) {
      try {
        const { argv } = vatParameters;
        if (argv[0] === 'plugin') {
          log(`starting plugin test`);
          const pluginManager = makePluginManager(devices.plugin, vatPowers);
          const { pluginRoot: pingPongP } = await E(pluginManager).load(
            'pingpong',
            {
              prefix: 'Whoopie ',
            },
          );
          E(vats.bridge).init(pingPongP);
          D(devices.bridge).registerInboundHandler(vats.bridge);
        } else {
          throw new Error(`unknown argv mode '${argv[0]}'`);
        }
      } catch (e) {
        console.error('have error', e);
        throw e;
      }
    },
  });
}
