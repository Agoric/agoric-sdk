import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { assert, details as X } from '@agoric/assert';

export const buildRootObject = (vatPowers, _vatParameters) => {
  const log = vatPowers.testLog;
  let pingPongP;
  return Far('root', {
    init: pingPong => {
      log(`installing pingPongP`);
      pingPongP = pingPong;
    },
    inbound: async msg => {
      try {
        switch (msg) {
          case 'pingpong': {
            log(`starting pingpong test`);
            const pong = await E(pingPongP).ping('Agoric!');
            log(`pingpong reply = ${pong}`);
            break;
          }
          default: {
            assert.fail(X`unknown bridge input ${msg}`);
          }
        }
      } catch (e) {
        console.error('failed with', e);
        log(`failed: ${e}`);
      }
    },
  });
};
