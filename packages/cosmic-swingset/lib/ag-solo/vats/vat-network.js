// @ts-check
import { E } from '@agoric/eventual-send';
import { makeRouterProtocol } from '@agoric/swingset-vat/src/vats/network/router';
import {
  makeLoopbackProtocolHandler,
  makeEchoConnectionHandler,
} from '@agoric/swingset-vat/src/vats/network';

export function buildRootObject(_vatPowers) {
  const network = {
    ...makeRouterProtocol(E),
    makeLoopbackProtocolHandler,
    makeEchoListener() {
      return harden({
        async onAccept(_port, _localAddr, _remoteAddr, _listenHandler) {
          return harden(makeEchoConnectionHandler());
        },
      });
    },
  };
  return harden(network);
}
