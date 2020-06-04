import harden from '@agoric/harden';

console.debug(`loading vat-relayer.js`);

// At any given moment, there is exactly one PacketHandler in place.

function buildRootObject(E) {
  /*
  function makeDefaultPacketHandler(src, dest, predecessorData) {
    return harden({
      onPacket(target, packet) {
        target(packet);
      },
      onAck(target, ackPacket) {
        target(ackPacket);
      },
      onHandshake(target, metaPacket) {
        target(metaPacket);
      },
      retire() {
        return { data: 'sample' };
      },
    });
  }
  */

  const defaultHandler = harden({
    handle(send, obj) {
      send(obj); // eg
    },
  });

  const currentHandler = defaultHandler;

  function doHandle(bridgeSender, arg) {
    function send(what) {
      E(bridgeSender).send(what);
    }
    currentHandler.handle(send, arg);
  }

  const root = {
    handle(...args) {
      console.log(`handle() invoked`);
      try {
        doHandle(...args);
        console.log(`handle() successful`);
      } catch (e) {
        console.log(`error during handle()`);
        console.log(e);
        throw e;
      }
    },
  };
  return harden(root);
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, buildRootObject, helpers.vatID);
}
