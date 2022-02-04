import { html } from 'lit';
import { stub, restore } from 'sinon';
import { fixture, expect } from '@open-wc/testing';
import '../agoric-petimage.js';
import Powerbox from '../src/Powerbox.js';

describe('AgoricPetimage', () => {
  beforeEach(() => {});

  afterEach(() => {
    restore();
  });

  it('passes the a11y audit', async () => {
    const el = await fixture(
      html` <agoric-petimage uid="AG.1"></agoric-petimage> `,
    );

    await expect(el).shadowDom.to.be.accessible();
  });

  it('calls Powerbox.expandPetdata on update', async () => {
    const expandPetdataStub = stub(Powerbox, 'expandPetdata');
    const el = await fixture(
      html` <agoric-petimage uid="AG.1"></agoric-petimage> `,
    );
    expect(expandPetdataStub).to.have.callCount(1);

    await el.setAttribute('uid', 'AG.2');

    expect(expandPetdataStub).to.have.callCount(2);
  });

  it('renders a div with the correct data', async () => {
    const el = await fixture(
      html` <agoric-petimage uid="AG.1"></agoric-petimage> `,
    );

    const inner = el.shadowRoot.querySelector('div');
    expect(inner.getAttribute('data-powerbox-target')).to.equal('img-if-known');
    expect(inner.getAttribute('data-powerbox-id')).to.equal('AG.1');
  });
});
