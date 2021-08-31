// @ts-check
import { html, css, LitElement } from 'lit';
import { classMap } from 'lit/directives/class-map.js';

import { Robot } from 'lit-robot';

import 'robot3/debug';
import { makeMachine } from './states.js';

import './agoric-iframe-messenger.js';


const DEFAULT_LOCATOR_URL = 'https://local.agoric.com/?append=/wallet-bridge.html';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export class AgoricWalletConnection extends Robot(LitElement) {
  static get styles() {
    return css`
      :host {
        display: block;
        padding: 25px;
        color: var(--agoric-wallet-connection-text-color, #000);
      }

      .connected {
        background-color: var(--agoric-wallet-connection-connected-background-color, #0f0);
      }

      .disconnected {
        background-color: var(--agoric-wallet-connection-disconnected-background-color, #f00);
      }
    `;
  }

  static get properties() {
    return {
      state: { type: String },
      connecting: { type: Boolean },
    };
  }

  get state() {
    return this.machine.state.name;
  }

  constructor() {
    super();
    this.connecting = false;
    this.onLocate = this.onLocate.bind(this);
    this.onOpen = this.onOpen.bind(this);
    this.onMessage = this.onMessage.bind(this);
  }

  get connecting() {
    return this._connecting;
  }

  set connecting(value) {
    console.log('connecting', value);
    if (value === this._connecting) {
      return;
    }
    this._connecting = value;
    // React to the change by triggering a location, then connect.
    if (value === true) {
      this.service.send('locate');
    }
  }

  onLocate(ev) {
    console.log(this.state, 'locate', ev);
    this.service.send({ type: 'located', href: ev.detail.href });
  }

  onFirstMessage(event) {
    console.log(this.state, 'first received', event);
    this.service.send({ type: 'connected' });

    // FIXME: Start a new epoch of the bridge captp.
    const walletEref = Promise.resolve({
      getScopedBridge: (suggestedDappPetname, dappOrigin) => {
        this.connecting = true;
        return bridgeP;
      },
    });

    const ev = new CustomEvent('open', { detail: walletEref });
    this.dispatchEvent(ev);

    this.onMessage(event);
  }

  onMessage(ev) {
    console.log(this.state, 'received', ev);
  }

  onOpen(ev) {
    console.log(this.state, 'open', ev);
  }

  onError(ev) {
    console.log(this.state, 'error', ev);
    this.service.send({ type: 'error', error: ev.detail.error });
  }

  render() {
    let src = '';
    let onMessage;
    switch (this.state) {
      case 'locating': {
        src = DEFAULT_LOCATOR_URL;
        onMessage = this.onLocate;
        break;
      }
      case 'connecting': {
        src = this.service.context.location;
        onMessage = this.onFirstMessage;
        break;
      }
      case 'bridged': {
        src = this.service.context.location;
        onMessage = this.onMessage;
        break;
      }
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
      ${this.state}
      ${backend}
    `;
  }
};

// Initialize the static property.
AgoricWalletConnection.machine = makeMachine(() => delay(3000));
