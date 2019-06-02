import Nat from '@agoric/nat';
import makePromise from '../kernel/makePromise';

export default function buildCommand() {
  let inboundCallback;
  const srcPath = require.resolve('./command-src');
  let nextCount = 0;
  const responses = new Map();

  function inboundCommand(obj) {
    // deliver the JSON-serializable object to the registered handler, and
    // return a promise that fires with a JSON-serializable object in
    // response
    const { p, res, reject } = makePromise();
    const count = nextCount;
    nextCount += 1;
    responses.set(count, { res, reject });
    if (!inboundCallback) {
      throw new Error(`inboundCommand before registerInboundCallback`);
    }
    try {
      inboundCallback(count, JSON.stringify(obj));
    } catch (e) {
      console.log(`error running inboundCallback: ${e} ${e.message}`);
    }
    return p;
  }

  let broadcastCallback;
  function registerBroadcastCallback(cb) {
    broadcastCallback = cb;
  }

  function sendBroadcast(kBodyString) {
    if (!broadcastCallback) {
      throw new Error(`sendBroadcast before registerBroadcastCallback`);
    }
    const obj = JSON.parse(`${kBodyString}`);
    broadcastCallback(obj);
  }

  function registerInboundCallback(cb) {
    inboundCallback = cb;
  }

  function deliverResponse(kCount, kIsReject, kResponseString) {
    const count = Nat(kCount);
    const isReject = Boolean(kIsReject);
    const obj = JSON.parse(`${kResponseString}`);
    if (!responses.has(count)) {
      // maybe just ignore it
      throw new Error(`unknown response index ${count}`);
    }
    const { res, reject } = responses.get(count);
    if (isReject) {
      reject(obj);
    } else {
      res(obj);
    }
  }

  return {
    srcPath,
    endowments: { registerInboundCallback, deliverResponse, sendBroadcast },
    inboundCommand, // for external access
    registerBroadcastCallback, // for external access
  };
}
