// Avoid importing the full captp bundle, which would carry
// in its own makeHardener, etc.
import { makeCapTP } from '@agoric/captp/lib/captp';
import { E } from '@agoric/eventual-send';

export const getCapTPHandler = (
  send,
  getLocalBootstrap,
  fallback = undefined,
) => {
  const chans = new Map();
  const doFallback = async (method, ...args) => {
    if (!fallback) {
      return harden({});
    }
    return E(fallback)[method](...args);
  };
  const handler = harden({
    onOpen(obj, meta) {
      const { channelHandle, origin = 'unknown' } = meta || {};
      console.debug(`Starting CapTP`, meta);
      const sendObj = o => {
        send(o, [channelHandle]);
      };
      const { dispatch, abort, getBootstrap: getRemoteBootstrap } = makeCapTP(
        origin,
        sendObj,
        async o => getLocalBootstrap(getRemoteBootstrap(), meta, o),
        {
          onReject(err) {
            // Be quieter for sanity's sake.
            console.log('CapTP', origin, 'exception:', err);
          },
        },
      );
      chans.set(channelHandle, {
        dispatch,
        abort,
      });
      doFallback('onOpen', obj, meta);
    },
    onClose(obj, meta) {
      console.debug(`Finishing CapTP`, meta);
      const chan = chans.get(meta.channelHandle);
      if (chan) {
        const { abort } = chan;
        abort();
      }
      chans.delete(meta.channelHandle);
      doFallback('onClose', obj, meta);
    },
    onError(obj, meta) {
      console.debug(`Error in CapTP`, meta, obj.error);
      const chan = chans.get(meta.channelHandle);
      if (chan) {
        const { abort } = chan;
        abort(obj.error);
      }
      doFallback('onError', obj, meta);
    },
    async onMessage(obj, meta) {
      console.debug('processing inbound', obj);
      const chan = chans.get(meta.channelHandle);
      if (chan) {
        const { dispatch } = chan;
        if (dispatch(obj)) {
          return true;
        }
      }
      const done = await doFallback('onMessage', obj, meta);
      if (!done) {
        console.error(`Could not find handler ${obj.type}`, meta);
      }
      return done;
    },
  });

  return harden(handler);
};
