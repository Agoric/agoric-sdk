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

import './agoric-iframe-messenger.js';

// TODO: Use something on agoric.app instead.
const DEFAULT_LOCATOR_URL =
  'https://local.agoric.com/?append=/wallet-bridge.html';

export class AgoricWalletConnection extends LitElement {
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
        this.service.send({ type: 'locate', suggestedDappPetname, dappOrigin });
        return this._bridgePK.promise;
      },
      reset: () => {
        this.service.send({ type: 'reset' });
        if (this._captp) {
          this._captp.abort();
          this._captp = null;
        }
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
      this._bridgePK.resolve(this._captp.getBootstrap());
    }
  }

  onLocateMessage(ev) {
    console.log(this.state, 'locate', ev);
    const { data } = ev.detail;
    assert.typeof(data, 'string', X`Expected locate message to be a string`);
    this.service.send({ type: 'located', href: data });
  }

  onConnectMessage(event) {
    console.log(this.state, 'connect received', event);
    const { data, send } = event.detail;
    assert.equal(
      data.type,
      'walletBridgeLoaded',
      X`Unexpected connect message type ${data.type}`,
    );

    this._startCapTP(send);

    // Received bridge announcement, so mark the connection as bridged.
    this.service.send({ type: 'connected' });
  }

  onBridgeMessage(ev) {
    console.log(this.state, 'bridge received', ev);
    const { data } = ev.detail;
    if (data && typeof data.type === 'string' && data.type.startsWith('CTP_')) {
      this._captp.dispatch(data);
    }
  }

  onError(event) {
    console.log(this.state, 'error', event);
    this.service.send({ type: 'error', error: event.detail.error });

    // Allow retries to get a fresh bridge.
    this._captp = null;
  }

  _startCapTP(send) {
    // Start a new epoch of the bridge captp.
    const epoch = this._nextEpoch;
    this._nextEpoch += 1;

    this._captp = makeCapTP(
      `${this.service.context.suggestedDappPetname}.${epoch}`,
      obj => {
        // console.log('sending', obj);
        send(obj);
      },
      this._walletCallbacks,
      { epoch },
    );
  }

  _getBridgeURL() {
    const { location, suggestedDappPetname } = this.service.context;
    const url = new URL(location);
    url.searchParams.append('suggestedDappPetname', suggestedDappPetname);
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
        src = this._getBridgeURL();
        onMessage = this.onConnectMessage;
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

    /** @type {import('lit-html').TemplateResult} */
    let backend = null;
    if (src) {
      backend = html`
        <agoric-iframe-messenger
          src=${src}
          @open=${this.onOpen}
          @message=${onMessage}
          @error=${this.onError}
        ></agoric-iframe-messenger>
      `;
    }

    return html`
      <div>Agoric Wallet Connection: ${this.state}</div>
      ${backend}
    `;
  }
}
