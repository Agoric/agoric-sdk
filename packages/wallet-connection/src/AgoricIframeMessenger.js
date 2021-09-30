/* eslint-disable no-underscore-dangle */
// @ts-check
import { LitElement, html } from 'lit';

import { assert } from '@agoric/assert';

export const makeAgoricIframeMessenger = (registerThis = _that => {}) =>
  class AgoricIframeMessenger extends LitElement {
    static get properties() {
      return { src: { type: String } };
    }

    constructor() {
      super();
      this.src = '';
      this._contentWindow = null;
      this._origin = null;

      // Need to bind since these aren't declarative event handlers.
      this.send = this.send.bind(this);
      this._onMessage = this._onMessage.bind(this);
      registerThis(this);
    }

    connectedCallback() {
      super.connectedCallback();
      window.addEventListener('message', this._onMessage);
    }

    disconnectedCallback() {
      window.removeEventListener('message', this._onMessage);
      super.disconnectedCallback();
    }

    render() {
      return html`
        <iframe
          title="Agoric Iframe Messenger"
          src=${this.src}
          @load=${this._onLoad}
          @abort=${this._onError}
          @error=${this._onError}
        ></iframe>
      `;
    }

    firstUpdated() {
      const iframe = this.renderRoot.querySelector('iframe');
      assert(iframe);
      // Detect the content window of the iframe to verify message sources.
      this._contentWindow = iframe.contentWindow;
    }

    _onLoad(event) {
      event.preventDefault();
      const ev = new CustomEvent('open', { detail: { send: this.send } });
      this._origin = new URL(this.src).origin;
      this.dispatchEvent(ev);
    }

    _onMessage(event) {
      // console.log('iframe message', event);
      if (event.source !== this._contentWindow) {
        return;
      }
      event.preventDefault();

      const ev = new CustomEvent('message', {
        detail: { data: event.data, send: this.send },
      });
      this.dispatchEvent(ev);
    }

    _onError(event) {
      event.preventDefault();
      const ev = new CustomEvent('error', { detail: { error: event.error } });
      this.dispatchEvent(ev);
    }

    send(data) {
      assert(this._contentWindow);
      assert(this._origin);
      this._contentWindow.postMessage(data, this._origin);
    }
  };

export const AgoricIframeMessenger = makeAgoricIframeMessenger();
