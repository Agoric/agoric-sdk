/* eslint-disable no-underscore-dangle */
// @ts-check
import { LitElement, html, css } from 'lit';

import { assert } from '@agoric/assert';

const CONNECTION_TIMEOUT_MS = 5000;

export const makeAgoricIframeMessenger = (registerThis = _that => {}) =>
  class AgoricIframeMessenger extends LitElement {
    static get properties() {
      return { src: { type: String } };
    }

    static get styles() {
      return css`
        :host {
          display: block;
        }
        iframe {
          border: none;
          overflow: auto;
          height: 64px;
        }
      `;
    }

    constructor() {
      super();
      this.src = '';
      this._contentWindow = null;
      this._origin = null;
      this._timeout = undefined;

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
          @abort=${this._onError}
          @error=${this._onError}
          scrolling="no"
        ></iframe>
      `;
    }

    updated() {
      this._origin = new URL(this.src).origin;
    }

    firstUpdated() {
      const iframe = this.renderRoot.querySelector('iframe');
      assert(iframe);
      // Detect the content window of the iframe to verify message sources.
      this._contentWindow = iframe.contentWindow;
      this._timeout = window.setTimeout(() => {
        const ev = new CustomEvent('error', {
          detail: { error: new Error('connection timeout') },
        });
        this.dispatchEvent(ev);
      }, CONNECTION_TIMEOUT_MS);
    }

    _onMessage(event) {
      // console.log('iframe message', event);
      if (event.source !== this._contentWindow) {
        return;
      }

      if (this._timeout) {
        window.clearTimeout(this._timeout);
        this._timeout = undefined;
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
