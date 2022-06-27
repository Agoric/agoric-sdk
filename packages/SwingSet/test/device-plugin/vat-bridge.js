import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
const { details: X } = assert;

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
            assert.fail(X`unknown bridge input ${msg}`);
          }
        }
      } catch (e) {
        console.error('failed with', e);
        log(`failed: ${e}`);
      }
    },
  });
}
