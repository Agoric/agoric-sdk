import { makePromiseKit } from '@agoric/promise-kit';
import { Nat } from '@agoric/nat';
import { parse, stringify } from '@agoric/marshal';

import { assert, details as X } from '@agoric/assert';

export default function buildCommand(broadcastCallback) {
  assert(broadcastCallback, X`broadcastCallback must be provided.`);
  let inboundCallback;
  const srcPath = require.resolve('./command-src');
  let nextCount = 0n;
  const responses = new Map();

  function inboundCommand(obj) {
    // deliver the JSON-serializable object to the registered handler, and
    // return a promise that fires with a JSON-serializable object in
    // response
    const { promise, resolve, reject } = makePromiseKit();
    const count = nextCount;
    nextCount += 1n;
    responses.set(count, { resolve, reject });
    assert(inboundCallback, X`inboundCommand before registerInboundCallback`);
    try {
      inboundCallback(count, stringify(obj));
    } catch (e) {
      console.error(`error running inboundCallback:`, e);
    }
    return promise;
  }

  function sendBroadcast(kBodyString) {
    const obj = parse(`${kBodyString}`);
    broadcastCallback(obj);
  }

  function registerInboundCallback(cb) {
    assert(!inboundCallback, X`registerInboundCallback called more than once`);
    inboundCallback = cb;
  }

  function deliverResponse(kCount, kIsReject, kResponseString) {
    const count = Nat(kCount);
    const isReject = Boolean(kIsReject);
    const obj = parse(`${kResponseString}`);
    // TODO this might not qualify as an error, it needs more thought
    // See https://github.com/Agoric/agoric-sdk/pull/2406#discussion_r575561554
    assert(responses.has(count), X`unknown response index ${count}`);
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
