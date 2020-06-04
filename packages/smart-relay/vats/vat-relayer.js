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

  let currentHandler = defaultHandler;

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

    install(handlerSrc) {
      try {
        console.log(`installing new handler, src=`, handlerSrc);
        console.log(`evaluating...`);
        // eslint-disable-next-line no-eval
        const makeHandler = (1,eval)(`(${handlerSrc})`);
        console.log(`eval returned`, makeHandler);
        if (typeof makeHandler !== 'function') {
          console.log(`handler source did not evaluate to function, rather to:`, makeHandler);
          return;
        }
        const endowments = { harden, E, console };
        currentHandler = harden(makeHandler(endowments));
        console.log(`installed`);
      } catch (e) {
        console.log(`error during install()`, e);
        throw e;
      }
    },
  };
  return harden(root);
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, buildRootObject, helpers.vatID);
}
