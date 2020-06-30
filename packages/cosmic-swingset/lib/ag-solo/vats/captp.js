/* global harden */

// Avoid importing the full captp bundle, which would carry
// in its own makeHardener, etc.
import { makeCapTP } from '@agoric/captp/lib/captp';

export const getCapTPHandler = (E, send, getBootstrapObject) => {
  const chans = new Map();
  const handler = harden({
    onOpen(_obj, meta) {
      const { channelHandle, origin = 'unknown' } = meta || {};
      console.debug(`Starting CapTP`, meta);
      const sendObj = o => {
        send(o, [channelHandle]);
      };
      const { dispatch, abort } = makeCapTP(
        origin,
        sendObj,
        getBootstrapObject,
      );
      chans.set(channelHandle, [dispatch, abort]);
    },
    onClose(_obj, meta) {
      console.debug(`Finishing CapTP`, meta);
      const dispatchAbort = chans.get(meta.channelHandle);
      if (dispatchAbort) {
        (1, dispatchAbort[1])();
      }
      chans.delete(meta.channelHandle);
    },
    onError(obj, meta) {
      console.debug(`Error in CapTP`, meta, obj.error);
    },
    onMessage(obj, meta) {
      console.debug('processing inbound', obj);
      const dispatchAbort = chans.get(meta.channelHandle);
      if (!dispatchAbort || !(1, dispatchAbort[0])(obj)) {
        console.error(`Could not find CapTP handler ${obj.type}`, meta);
        return false;
      }
      return true;
    },
  });

  return harden({
    getCommandHandler() {
      return handler;
    },
  });
};
