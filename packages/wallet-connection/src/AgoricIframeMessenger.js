// @ts-check
import { LitElement, html } from 'lit';

export class AgoricIframeMessenger extends LitElement {
  static get properties() {
    return { src: { type: String } };
  }

  constructor() {
    super();
    this.src = '';
    this._contentWindow = null;
    this._onMessage = this._onMessage.bind(this);
    this._onLoad = this._onLoad.bind(this);
    this._onError = this._onError.bind(this);
  }

  connectedCallback() {
    window.addEventListener('message', this._onMessage);
    super.connectedCallback();
  }

  disconnectedCallback() {
    window.removeEventListener('message', this._onMessage);
    super.disconnectedCallback();
  }

  render() {
    return html`
      <iframe src=${this.src} @load=${this._onLoad} @error=${this._onError}></iframe>
    `;
  }

  firstUpdated() {
    // Detect the content window of the iframe to verify message sources.
    this._contentWindow = this.renderRoot.querySelector('iframe').contentWindow;
  }

  _onLoad(event) {
    event.preventDefault();
    const ev = new CustomEvent('open');
    this.dispatchEvent(ev);
  }

  _onMessage(event) {
    if (event.source !== this._contentWindow) {
      return;
    }
    event.preventDefault();

    const ev = new CustomEvent('message', { detail: { href: event.data } });
    this.dispatchEvent(ev);
  }

  _onError(event) {
    event.preventDefault();
    const ev = new CustomEvent('error', { detail: event });
    this.dispatchEvent(ev);
  }

  send(data) {
    this._contentWindow.postMessage(data, new URL(this.src).origin);
  }
}
