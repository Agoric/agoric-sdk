// eslint-disable-next-line no-unused-vars
function makePolicy(endowments) {
  const { E, harden, console, timerManager } = endowments;

  // this delivers every message, but one second late

  function wait(duration) {
    let r;
    const p = new Promise(r0 => (r = r0));
    const handler = harden({
      wake(_intendedTime) {
        r();
      },
    });
    E(timerManager).setWakeup(duration, handler);
    return p;
  }

  function makeDelayHandler(_oldState) {
    return harden({
      onPacket(target, packet) {
        console.log(`delaying packet by 2s`);
        wait(2.0).then(() => E(target).deliver(packet));
      },
      onAck(target, ackPacket) {
        console.log(`delaying ack by 2s`);
        wait(2.0).then(() => E(target).deliver(ackPacket));
      },
      onHandshake(target, metaPacket) {
        console.log(`delaying handshake by 5s`);
        wait(5.0).then(() => E(target).deliver(metaPacket));
      },
      retire() {
        return harden({});
      },
    });
  }

  const delayPolicy = harden({
    open(src, dest, oldState = undefined) {
      return makeDelayHandler(oldState);
    },
  });

  return delayPolicy;
}
