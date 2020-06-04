// eslint-disable-next-line no-unused-vars
function makePolicy(endowments) {
  const { E, harden, console } = endowments;

  // for any given channel, this handler drops every other message. it will
  // make you sad.

  function makeHalfDropHandler(oldState) {
    let drop = false;
    if (
      oldState &&
      oldState.isHalfDropHandler &&
      Reflect.has(oldState, 'drop')
    ) {
      drop = oldState.drop;
    }
    function shouldPass() {
      drop = !drop;
      return drop;
    }

    return harden({
      onPacket(target, packet) {
        if (shouldPass()) {
          E(target).deliver(packet);
        } else {
          console.log(`dropping packet`);
        }
      },
      onAck(target, ackPacket) {
        if (shouldPass()) {
          E(target).deliver(ackPacket);
        } else {
          console.log(`dropping ack`);
        }
      },
      onHandshake(target, metaPacket) {
        if (shouldPass()) {
          E(target).deliver(metaPacket);
        } else {
          console.log(`dropping handshake`);
        }
      },
      retire() {
        return harden({
          isHalfDropHandler: true,
          drop,
        });
      },
    });
  }

  const halfDropPolicy = harden({
    open(src, dest, oldState = undefined) {
      return makeHalfDropHandler(oldState);
    },
  });

  return halfDropPolicy;
}
