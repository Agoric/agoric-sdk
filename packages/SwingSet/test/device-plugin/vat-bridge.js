import { E } from '@agoric/eventual-send';

export function buildRootObject(vatPowers, _vatParameters) {
  const log = vatPowers.testLog;
  let pingPongP;
  return harden({
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
            throw new Error(`unknown bridge input ${msg}`);
          }
        }
      } catch (e) {
        console.error('failed with', e);
        log(`failed: ${e}`);
      }
    },
  });
}
