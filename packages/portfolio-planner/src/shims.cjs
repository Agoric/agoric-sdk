// @ts-nocheck
/* eslint-disable */
if (!Promise.withResolvers) {
  Promise.withResolvers = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

if (typeof WebSocket === 'undefined') {
  globalThis.WebSocket = require('ws').WebSocket;
  // globalThis.WebSocket = require('websocket').w3cwebsocket;
}
