// @ts-check
import { E, makeCapTP } from '@endo/captp';
import { Far } from '@endo/marshal';

export const getCapTPHandler = (send, getLocalBootstrap, fallback) => {
  let lastEpoch = 0;
  const chans = new Map();
  const doFallback = async (method, ...args) => {
    if (!fallback) {
      return false;
    }
    return E(fallback)[method](...args);
  };
  const handler = Far('capTpHandler', {
    onOpen(obj, meta) {
      const { channelHandle, origin = 'unknown' } = meta || {};
      lastEpoch += 1;
      const epoch = lastEpoch;
      console.debug(`Starting CapTP#${epoch}`, meta);
      const sendObj = o => {
        send(o, [channelHandle]);
      };
      const {
        dispatch,
        abort,
        getBootstrap: getRemoteBootstrap,
      } = makeCapTP(
        origin,
        sendObj,
        async o => getLocalBootstrap(getRemoteBootstrap(), meta, o),
        {
          // Disambiguate in case we receive messages from different
          // connections.
          epoch,
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
      doFallback('onOpen', obj, meta).catch(e => {
        console.error(`Error in fallback onOpen`, e);
      });
    },
    onClose(obj, meta) {
      console.debug(`Finishing CapTP`, meta);
      const chan = chans.get(meta.channelHandle);
      if (chan) {
        const { abort } = chan;
        abort();
      }
      chans.delete(meta.channelHandle);
      doFallback('onClose', obj, meta).catch(e => {
        console.error(`Error in fallback onClose`, e);
      });
    },
    onError(obj, meta) {
      console.debug(`Error in CapTP`, meta, obj.error);
      const chan = chans.get(meta.channelHandle);
      if (chan) {
        const { abort } = chan;
        abort(obj.error);
      }
      doFallback('onError', obj, meta).catch(e => {
        console.error(`Error in fallback onError`, e);
      });
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
        console.error(`Could not find handler ${obj.type}`, obj, meta);
      }
      return done;
    },
  });

  return harden(handler);
};
