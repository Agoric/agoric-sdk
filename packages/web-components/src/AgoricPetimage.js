import { html, LitElement } from 'lit';
import Powerbox from './Powerbox.js';

export class AgoricPetimage extends LitElement {
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
      <div
        data-powerbox-target="img-if-known"
        data-powerbox-id="${this.uid}"
      ></div>
    `;
  }
}
