import { html, LitElement } from 'lit';
import Powerbox from './Powerbox.js';

export class AgoricPetname extends LitElement {
  static get properties() {
    return {
      uid: { type: String },
    };
  }

  // eslint-disable-next-line class-methods-use-this
  updated() {
    Powerbox.expandPetdata();
  }

  render() {
    return html`
      <span
        data-powerbox-target="petname-if-known"
        data-powerbox-id="${this.uid}"
      >
        ${this.uid}
      </span>
    `;
  }
}
