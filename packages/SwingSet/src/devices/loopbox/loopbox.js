import { Fail } from '@endo/errors';

/*
 * The "loopbox" is a special device used for unit tests, which glues one
 * comms+vattp pair to another, within the same swingset machine. It looks
 * like a regular mailbox, but everything added to it is delivered into the
 * other vattp, rather than being serialized and sent out onto a network
 * somehow.
 *
 * deliverMode='immediate' means each message sent by e.g. left-vattp will be
 * immediately enqueued for delivery to right-vattp.
 *
 * deliverMode='queued' will stall the message until the host invokes our
 * `passOneMessage()` message function. We need this to exercise bugs like
 * #1400 which are sensitive to cross-machine message delivery order.
 */

export function buildLoopbox(deliverMode) {
  deliverMode === 'immediate' ||
    deliverMode === 'queued' ||
    Fail`deliverMode=${deliverMode}, must be 'immediate' or 'queued'`;
  const loopboxSrcPath = new URL('device-loopbox.js', import.meta.url).pathname;

  let loopboxPassOneMessage;
  function registerPassOneMessage(lpom) {
    loopboxPassOneMessage = lpom;
  }
  function passOneMessage() {
    return loopboxPassOneMessage();
  }

  const loopboxEndowments = {
    registerPassOneMessage,
    deliverMode,
  };
  return harden({ passOneMessage, loopboxSrcPath, loopboxEndowments });
}
