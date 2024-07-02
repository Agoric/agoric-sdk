import { Far, E } from '@endo/far';
import { Fail } from '@endo/errors';
import { makePluginManager } from '../../src/vats/plugin-manager.js';

export function buildRootObject(vatPowers, vatParameters) {
  const { D } = vatPowers;
  const log = vatPowers.testLog;
  return Far('root', {
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
          D(devices.bridge).registerInboundHandler(vats.bridge);
          await E(vats.bridge).init(pingPongP, devices.bridge);
        } else {
          Fail`unknown argv mode '${argv[0]}'`;
        }
      } catch (e) {
        console.error('have error', e);
        throw e;
      }
    },
  });
}
