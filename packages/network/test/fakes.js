// @ts-check
import { prepareVowTools } from '@agoric/vow';
import assert from 'node:assert/strict';
import {
  prepareEchoConnectionKit,
  prepareNetworkPowers,
  prepareNetworkProtocol,
  preparePortAllocator,
} from '../src/index.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {ListenHandler, MakeEchoConnectionKit} from '../src/index.js';
 */

// eslint-disable-next-line no-constant-condition
const log = false ? console.log : () => {};

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {MakeEchoConnectionKit} makeEchoConnectionHandler
 * @param {{when: any}} powers
 */
export const prepareProtocolHandler = (
  zone,
  makeEchoConnectionHandler,
  { when },
) => {
  const makeProtocolHandler = zone.exoClass(
    'ProtocolHandler',
    undefined,
    () => {
      return {
        /** @type {ListenHandler | undefined } */
        l: undefined,
        lp: undefined,
        nonce: 0,
      };
    },
    {
      async onInstantiate(_port, _localAddr, _remote, _protocol) {
        return '';
      },
      async onCreate(_protocol, _impl) {
        log('created', _protocol, _impl);
      },
      async generatePortID() {
        this.state.nonce += 1;
        return `port-${this.state.nonce}`;
      },
      async onBind(port, localAddr) {
        assert(port, `port is supplied to onBind`);
        assert(localAddr, `local address is supplied to onBind`);
      },
      async onConnect(port, localAddr, remoteAddr) {
        assert(port, `port is tracked in onConnect`);
        assert(localAddr, `local address is supplied to onConnect`);
        assert(remoteAddr, `remote address is supplied to onConnect`);
        if (!this.state.lp) {
          return { handler: makeEchoConnectionHandler().handler };
        }
        assert(this.state.l);
        const ch = await when(
          this.state.l.onAccept(
            this.state.lp,
            localAddr,
            remoteAddr,
            this.state.l,
          ),
        );
        return { localAddr, handler: ch };
      },
      async onListen(port, localAddr, listenHandler) {
        assert(port, `port is tracked in onListen`);
        assert(localAddr, `local address is supplied to onListen`);
        assert(listenHandler, `listen handler is tracked in onListen`);
        this.state.lp = port;
        this.state.l = listenHandler;
        log('listening', port.getLocalAddress(), listenHandler);
      },
      async onListenRemove(port, localAddr, listenHandler) {
        assert(port, `port is tracked in onListen`);
        assert(localAddr, `local address is supplied to onListen`);
        assert.equal(
          listenHandler,
          this.state.lp && this.state.l,
          `listenHandler is tracked in onListenRemove`,
        );
        this.state.lp = undefined;
        log('port done listening', port.getLocalAddress());
      },
      async onRevoke(port, localAddr) {
        assert(port, `port is tracked in onRevoke`);
        assert(localAddr, `local address is supplied to onRevoke`);
        log('port done revoking', port.getLocalAddress());
      },
    },
  );

  return makeProtocolHandler;
};

/**
 *
 * @param {Zone} zone
 */
export const fakeNetworkEchoStuff = zone => {
  const vowTools = prepareVowTools(zone);
  const powers = prepareNetworkPowers(zone, vowTools);

  const { makeVowKit, when } = powers;
  const makeNetworkProtocol = prepareNetworkProtocol(zone, powers);
  const makeEchoConnectionHandler = prepareEchoConnectionKit(zone);
  const makeProtocolHandler = prepareProtocolHandler(
    zone,
    makeEchoConnectionHandler,
    powers,
  );
  const protocol = makeNetworkProtocol(makeProtocolHandler());

  const makePortAllocator = preparePortAllocator(zone, powers);
  const portAllocator = makePortAllocator({ protocol });

  return {
    makeEchoConnectionHandler,
    makeVowKit,
    portAllocator,
    protocol,
    when,
  };
};
