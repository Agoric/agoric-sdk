import { assert, details } from '@agoric/assert';
import { insistCapData } from '../capdata';

export function makeMessageResult(message, resultPolicy, panic) {
  let currentStatus = 'pending';
  let eventualResolution;

  assert(
    resultPolicy === 'logAlways' ||
      resultPolicy === 'logFailure' ||
      resultPolicy === 'panic' ||
      resultPolicy === 'ignore',
    details`invalid result policy ${resultPolicy}`,
  );
  assert.typeof(panic, 'function');

  function log() {
    // prettier-ignore
    console.log(
      `kernel message ${message}: ${currentStatus} ${JSON.stringify(eventualResolution)}`,
    );
  }

  return harden([
    {
      status() {
        return currentStatus;
      },
      resolution() {
        if (currentStatus === 'pending') {
          throw new Error(`resolution of result is still pending`);
        } else {
          return eventualResolution;
        }
      },
    },
    {
      noteResolution(newStatus, resolvedTo) {
        assert(currentStatus === 'pending', 'already resolved');
        assert(
          newStatus === 'fulfilled' || newStatus === 'rejected',
          details`invalid newStatus ${newStatus}`,
        );
        insistCapData(resolvedTo);
        currentStatus = newStatus;
        eventualResolution = resolvedTo;
        switch (resultPolicy) {
          case 'logAlways':
            log();
            break;
          case 'logFailure':
            if (newStatus === 'rejected') {
              log();
            }
            break;
          case 'panic':
            if (newStatus === 'rejected') {
              log();
              // TODO: unmarshal resolvedTo.data into an Error object and
              // pass it to panic()
              panic(`${message} failure`);
            }
            break;
          case 'ignore':
            break;
          default:
            throw new Error("this can't happen");
        }
      },
    },
  ]);
}
