// Avoid importing the full captp bundle, which would carry
// in its own makeHardener, etc.
import { makeCapTP } from '@agoric/captp/lib/captp';
import harden from '@agoric/harden';

export const getCapTPHandler = (E, send, getBootstrapObject) => {
  const chans = new Map();
  const handler = harden({
    onOpen(_obj, meta) {
      const { channelHandle, origin = 'unknown' } = meta || {};
      console.info(`Starting CapTP`, meta);
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
      console.log(`Finishing CapTP`, meta);
      const dispatchAbort = chans.get(meta.channelHandle);
      if (dispatchAbort) {
        (1, dispatchAbort[1])();
      }
      chans.delete(meta.channelHandle);
    },
    onError(obj, meta) {
      console.log(`Error in CapTP`, meta, obj.error);
    },
    onMessage(obj, meta) {
      console.error('processing inbound', obj);
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
