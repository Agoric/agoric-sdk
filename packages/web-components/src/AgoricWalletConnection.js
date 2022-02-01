/* eslint-disable no-underscore-dangle */
// @ts-check
import { html, css, LitElement } from 'lit';

import { assert, details as X } from '@agoric/assert';
import { makeCapTP as defaultMakeCapTP } from '@endo/captp';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@agoric/promise-kit';

import 'robot3/debug';
import { interpret } from 'robot3';

import { makeConnectionMachine } from './states.js';

import { makeAdminWebSocketConnector } from './admin-websocket-connector.js';
import { makeBridgeIframeConnector } from './bridge-iframe-connector.js';

// TODO: Use something on agoric.app instead.
const DEFAULT_LOCATOR_URL =
  'https://local.agoric.com/?append=/wallet-bridge.html';

export const makeAgoricWalletConnection = (makeCapTP = defaultMakeCapTP) =>
  class AgoricWalletConnection extends LitElement {
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
          makeConnector = makeBridgeIframeConnector,
        ) => {
          assert.equal(
            this.state,
            'idle',
            X`Cannot get scoped bridge in state ${this.state}`,
          );
          this.service.send({
            type: 'locate',
            connectionParams: {
              caller: 'getScopedBridge',
              suggestedDappPetname,
              dappOrigin,
              makeConnector,
            },
          });
          return this._bridgePK.promise;
        },
        getAdminBootstrap: (
          accessToken,
          makeConnector = makeAdminWebSocketConnector,
        ) => {
          assert.equal(
            this.state,
            'idle',
            X`Cannot get admin bootstrap in state ${this.state}`,
          );
          this.service.send({
            type: 'locate',
            connectionParams: {
              caller: 'getAdminBootstrap',
              accessToken,
              makeConnector,
            },
          });
          return this._bridgePK.promise;
        },
        reset: () => {
          this.service.send({ type: 'reset' });
          if (this._captp) {
            this._captp.abort();
            this._captp = null;
          }
          if (this._connector) {
            this._connector.hostDisconnected();
            this._connector = null;
          }
          this._bridgePK.reject(Error('Connection reset'));
          this._bridgePK = makePromiseKit();
        },
      });

      return this._walletConnection;
    }

    constructor() {
      super();

      // This state machine integration is much like lit-robot, but also raises
      // state events.
      const machine = makeConnectionMachine();
      const onState = (service, requestUpdate = true) => {
        this.machine = service.machine;
        const ev = new CustomEvent('state', {
          detail: {
            ...this.machine.context,
            state: this.machine.state.name,
            walletConnection: this.walletConnection,
          },
        });
        this.dispatchEvent(ev);
        if (requestUpdate) {
          this.requestUpdate();
        }
      };
      this.service = interpret(machine, onState);
      this.machine = this.service.machine;

      // Wait until we load before sending the first state.
      this.firstUpdated = () => onState(this.service, false);

      this._nextEpoch = 0;
      this._bridgePK = makePromiseKit();

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

    onError(event) {
      console.log(this.state, 'error', event);
      this.service.send({
        type: 'error',
        error: (event.detail && event.detail.error) || 'Unknown error',
      });

      // Allow retries to get a fresh bridge.
      this._captp = null;
    }

    _startCapTP(send, ourEndpoint, ourPublishedBootstrap) {
      // Start a new epoch of the bridge captp.
      const epoch = this._nextEpoch;
      this._nextEpoch += 1;

      this._captp = makeCapTP(
        `${ourEndpoint}.${epoch}`,
        obj => {
          // console.log('sending', obj);
          send(obj);
        },
        ourPublishedBootstrap,
        { epoch },
      );
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      if (this._captp) {
        this._captp.abort();
        this._captp = null;
      }
      if (this._connector) {
        this._connector.hostDisconnected();
        this._connector = null;
      }
    }

    render() {
      /** @type {import('lit-html').TemplateResult<1> | undefined} */
      let backend;
      switch (this.state) {
        case 'locating': {
          backend = html`
            <agoric-iframe-messenger
              src=${DEFAULT_LOCATOR_URL}
              @open=${this.onOpen}
              @message=${this.onLocateMessage}
              @error=${this.onError}
            ></agoric-iframe-messenger>
          `;
          break;
        }
        case 'approving':
        case 'bridged':
        case 'connecting': {
          if (!this._connector) {
            this._connector = this.service.context.connectionParams.makeConnector(
              this,
            );
            this._connector.hostConnected();
          }
          backend = this._connector.render();
          break;
        }
        default:
      }

      return html`
        <div>Agoric Wallet Connection: ${this.state}</div>
        ${backend}
      `;
    }
  };

export const AgoricWalletConnection = makeAgoricWalletConnection();
