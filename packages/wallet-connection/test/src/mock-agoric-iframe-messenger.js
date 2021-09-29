/* eslint-disable no-underscore-dangle */
// @ts-check
import { LitElement, html } from 'lit';

/**
 * @typedef {Object} MockIframeController - orchestrates a MockAgoricIframeMessenger
 * @property {Object} [ref] - The current MockAgoricIframeMessenger instance;
 */

/**
 * @param {string} mockController
 */
export const makeMockAgoricIframeMessenger = mockController =>
  class MockAgoricIframeMessenger extends LitElement {
    static get properties() {
      return { src: { type: String } };
    }

    constructor() {
      super();
      this.src = '';
      this.sentData = null;
      window[mockController].ref = this;
    }

    // eslint-disable-next-line class-methods-use-this
    render() {
      return html`
        <iframe
          title="Agoric Iframe Messenger"
          src=${this.src}
          @load=${this.onLoad}
        ></iframe>
      `;
    }

    onLoad() {
      const ev = new CustomEvent('open', {
        detail: { send: this.send.bind(this) },
      });
      this._origin = new URL(this.src).origin;
      this.dispatchEvent(ev);
    }

    onMessage(data) {
      const ev = new CustomEvent('message', {
        detail: { data, send: this.send.bind(this) },
      });
      this.dispatchEvent(ev);
    }

    onError(error) {
      const ev = new CustomEvent('error', { detail: { error } });
      this.dispatchEvent(ev);
    }

    // eslint-disable-next-line class-methods-use-this
    send(data) {
      this.sentData = data;
    }
  };
