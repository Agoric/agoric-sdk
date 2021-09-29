/* eslint-disable no-underscore-dangle */
// @ts-check
import { html, css, LitElement } from 'lit';

import { assert, details as X } from '@agoric/assert';
import { makeCapTP } from '@agoric/captp';
import { Far } from '@agoric/marshal';
import { makePromiseKit } from '@agoric/promise-kit';

import 'robot3/debug';
import { interpret } from 'robot3';

import { makeConnectionMachine } from './states.js';
import { makeAgoricIframeMessenger } from './agoric-iframe-messenger.js';

// TODO: Use something on agoric.app instead.
const DEFAULT_LOCATOR_URL =
  'https://local.agoric.com/?append=/wallet-bridge.html';

export const makeAgoricWalletConnection = (
  makeIframe = makeAgoricIframeMessenger,
  capTP = makeCapTP,
) => {
  window.customElements.define('agoric-iframe-messenger', makeIframe());

  return class AgoricWalletConnection extends LitElement {
    static get styles() {
      return css`
        :host {
          display: block;
          padding: 25px;
          color: var(--agoric-wallet-connection-text-color, #000);
        }
      `;
    }

    static get properties() {
      return {
        state: { type: String },
      };
    }

    get state() {
      return this.machine.state.name;
    }

    get walletConnection() {
      if (this._walletConnection) {
        // Cached.
        return this._walletConnection;
      }

      this._walletConnection = Far('WalletConnection', {
        getScopedBridge: (
          suggestedDappPetname,
          dappOrigin = window.location.origin,
        ) => {
          assert.equal(
            this.state,
            'idle',
            X`Cannot get scoped bridge in state ${this.state}`,
          );
          this.service.send({
            type: 'locate',
            destination: 'bridge',
            suggestedDappPetname,
            dappOrigin,
          });
          return this._bridgePK.promise;
        },
        getAdminBootstrap: accessToken => {
          assert.equal(
            this.state,
            'idle',
            X`Cannot get admin bootstrap in state ${this.state}`,
          );
          this.service.send({
            type: 'locate',
            destination: 'admin',
            accessToken,
          });
          return this._adminBootstrapPK.promise;
        },
        reset: () => {
          this.service.send({ type: 'reset' });
          if (this._captp) {
            this._captp.abort();
            this._captp = null;
          }
          this._bridgePK.reject(Error('Connection reset'));
          this._adminBootstrapPK.reject(Error('Connection reset'));
          this._bridgePK = makePromiseKit();
          this._adminBootstrapPK = makePromiseKit();
        },
      });

      return this._walletConnection;
    }

    constructor() {
      super();

      // This state machine integration is much like lit-robot, but also raises
      // state events.
      const machine = makeConnectionMachine();
      const onState = service => {
        this.machine = service.machine;
        const ev = new CustomEvent('state', {
          detail: {
            ...this.machine.context,
            state: this.machine.state.name,
            walletConnection: this.walletConnection,
          },
        });
        this.dispatchEvent(ev);
        this.requestUpdate();
      };
      this.service = interpret(machine, onState);
      this.machine = this.service.machine;

      // Wait until we load before sending the first state.
      this.firstUpdated = () => onState(this.service);

      this._nextEpoch = 0;
      this._bridgePK = makePromiseKit();
      this._adminBootstrapPK = makePromiseKit();

      this._walletCallbacks = Far('walletCallbacks', {
        needDappApproval: (dappOrigin, suggestedDappPetname) => {
          this.service.send({
            type: 'needDappApproval',
            dappOrigin,
            suggestedDappPetname,
          });
        },
        dappApproved: dappOrigin => {
          this.service.send({ type: 'dappApproved', dappOrigin });
        },
      });
    }

    onOpen(ev) {
      console.log(this.state, 'open', ev);
      if (this.state === 'bridged') {
        assert(this._captp);
        this._bridgePK.resolve(this._captp.getBootstrap());
      }
    }

    onLocateMessage(ev) {
      console.log(this.state, 'locate', ev);
      const { data } = ev.detail;
      assert.typeof(data, 'string', X`Expected locate message to be a string`);
      this.service.send({ type: 'located', href: data });
    }

    onAdminOpen(ws) {
      const send = obj => ws.send(JSON.stringify(obj));
      this._startCapTP(send, 'walletAdmin');

      assert(this._captp);
      const { dispatch, abort, getBootstrap } = this._captp;

      ws.addEventListener('message', ev => {
        const obj = JSON.parse(ev.data);
        dispatch(obj);
      });

      ws.addEventListener('close', () => {
        abort();
      });

      this._adminBootstrapPK.resolve(getBootstrap());

      // Mark the connection as admin.
      this.service.send({ type: 'connected' });
    }

    onConnectMessage(event) {
      console.log(this.state, 'connect received', event);
      const { data, send } = event.detail;
      assert.equal(
        data.type,
        'walletBridgeLoaded',
        X`Unexpected connect message type ${data.type}`,
      );

      this._startCapTP(
        send,
        this.service.context.suggestedDappPetname,
        this._walletCallbacks,
      );

      // Received bridge announcement, so mark the connection as bridged.
      this.service.send({ type: 'connected' });
    }

    onBridgeMessage(ev) {
      console.log(this.state, 'bridge received', ev);
      const { data } = ev.detail;
      if (
        data &&
        typeof data.type === 'string' &&
        data.type.startsWith('CTP_')
      ) {
        assert(this._captp);
        this._captp.dispatch(data);
      }
    }

    onError(event) {
      console.log(this.state, 'error', event);
      this.service.send({
        type: 'error',
        error: event.detail ? event.detail.error : 'Unknown error',
      });

      // Allow retries to get a fresh bridge.
      this._captp = null;
    }

    _getBridgeURL() {
      const { location, suggestedDappPetname } = this.service.context;
      assert(location);
      const url = new URL(location);
      if (suggestedDappPetname) {
        url.searchParams.append('suggestedDappPetname', suggestedDappPetname);
      }
      return url.href;
    }

    _startCapTP(send, ourEndpoint, ourPublishedBootstrap) {
      // Start a new epoch of the bridge captp.
      const epoch = this._nextEpoch;
      this._nextEpoch += 1;

      this._captp = capTP(
        `${ourEndpoint}.${epoch}`,
        obj => {
          // console.log('sending', obj);
          send(obj);
        },
        ourPublishedBootstrap,
        { epoch },
      );
    }

    _getAdminURL() {
      const { location, accessToken } = this.service.context;
      assert(location);

      // Find the websocket protocol for this path.
      const url = new URL('/private/captp', location);
      url.protocol = url.protocol.replace(/^http/, 'ws');

      if (accessToken) {
        url.searchParams.set('accessToken', accessToken);
      }

      return url.href;
    }

    render() {
      let src = '';
      let onMessage;
      switch (this.state) {
        case 'locating': {
          src = DEFAULT_LOCATOR_URL;
          onMessage = this.onLocateMessage;
          break;
        }
        case 'connecting': {
          const { destination } = this.service.context;
          switch (destination) {
            case 'admin': {
              const ws = new WebSocket(this._getAdminURL());
              ws.addEventListener('open', () => this.onAdminOpen(ws));
              ws.addEventListener('error', this.onError);
              break;
            }
            case 'bridge': {
              src = this._getBridgeURL();
              onMessage = this.onConnectMessage;
              break;
            }
            default: {
              assert.fail(`Destination ${destination} must be set`);
            }
          }
          break;
        }
        case 'approving':
        case 'bridged': {
          src = this._getBridgeURL();
          onMessage = this.onBridgeMessage;
          break;
        }
        default:
      }

      /** @type {import('lit-html').TemplateResult<1>} */
      let backend;
      if (src) {
        backend = html`
          <agoric-iframe-messenger
            src=${src}
            @open=${this.onOpen}
            @message=${onMessage}
            @error=${this.onError}
          ></agoric-iframe-messenger>
        `;
      } else {
        backend = html``;
      }

      return html`
        <div>Agoric Wallet Connection: ${this.state}</div>
        ${backend}
      `;
    }
  };
};
