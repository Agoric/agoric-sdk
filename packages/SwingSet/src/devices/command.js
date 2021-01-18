import Nat from '@agoric/nat';
import { makePromiseKit } from '@agoric/promise-kit';

export default function buildCommand(broadcastCallback) {
  if (!broadcastCallback) {
    throw new Error(`broadcastCallback must be provided.`);
  }
  let inboundCallback;
  const srcPath = require.resolve('./command-src');
  let nextCount = 0;
  const responses = new Map();

  function inboundCommand(obj) {
    // deliver the JSON-serializable object to the registered handler, and
    // return a promise that fires with a JSON-serializable object in
    // response
    const { promise, resolve, reject } = makePromiseKit();
    const count = nextCount;
    nextCount += 1;
    responses.set(count, { resolve, reject });
    if (!inboundCallback) {
      throw new Error(`inboundCommand before registerInboundCallback`);
    }
    try {
      inboundCallback(count, JSON.stringify(obj));
    } catch (e) {
      console.error(`error running inboundCallback:`, e);
    }
    return promise;
  }

  function sendBroadcast(kBodyString) {
    const obj = JSON.parse(`${kBodyString}`);
    broadcastCallback(obj);
  }

  function registerInboundCallback(cb) {
    if (inboundCallback) {
      throw new Error(`registerInboundCallback called more than once`);
    }
    inboundCallback = cb;
  }

  function deliverResponse(kCount, kIsReject, kResponseString) {
    const count = Nat(BigInt(kCount));
    const isReject = Boolean(kIsReject);
    let obj;
    // TODO: is this safe against kernel-realm trickery? It's awfully handy
    // to let the kernel-side result be 'undefined'
    if (kResponseString !== undefined) {
      obj = JSON.parse(`${kResponseString}`);
    }
    if (!responses.has(count)) {
      // maybe just ignore it
      throw new Error(`unknown response index ${count}`);
    }
    const { resolve, reject } = responses.get(count);
    if (isReject) {
      reject(obj);
    } else {
      resolve(obj);
    }
  }

  return {
    srcPath,
    endowments: { registerInboundCallback, deliverResponse, sendBroadcast },
    inboundCommand, // for external access
  };
}
