import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { Fail } from '@agoric/assert';

export function buildRootObject(vatPowers, _vatParameters) {
  const log = vatPowers.testLog;
  let pingPongP;
  return Far('root', {
    init(pingPong) {
      log(`installing pingPongP`);
      pingPongP = pingPong;
    },
    async inbound(msg) {
      try {
        switch (msg) {
          case 'pingpong': {
            log(`starting pingpong test`);
            const pong = await E(pingPongP).ping('Agoric!');
            log(`pingpong reply = ${pong}`);
            break;
          }
          default: {
            Fail`unknown bridge input ${msg}`;
          }
        }
      } catch (e) {
        console.error('failed with', e);
        log(`failed: ${e}`);
      }
    },
  });
}
