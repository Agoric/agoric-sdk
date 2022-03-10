import { html } from 'lit';
import { stub, restore } from 'sinon';
import { fixture, expect } from '@open-wc/testing';
import '../agoric-petname.js';
import Powerbox from '../src/Powerbox.js';

describe('AgoricPetname', () => {
  beforeEach(() => {});

  afterEach(() => {
    restore();
  });

  it('passes the a11y audit', async () => {
    const el = await fixture(
      html` <agoric-petname uid="AG.1"></agoric-petname> `,
    );

    await expect(el).shadowDom.to.be.accessible();
  });

  it('calls Powerbox.expandPetdata on update', async () => {
    const expandPetdataStub = stub(Powerbox, 'expandPetdata');
    const el = await fixture(
      html` <agoric-petname uid="AG.1"></agoric-petname> `,
    );
    expect(expandPetdataStub).to.have.callCount(1);

    await el.setAttribute('uid', 'AG.2');

    expect(expandPetdataStub).to.have.callCount(2);
  });

  it('renders a span with the correct data', async () => {
    const el = await fixture(
      html` <agoric-petname uid="AG.1"></agoric-petname> `,
    );

    const inner = el.shadowRoot.querySelector('span');
    expect(inner.getAttribute('data-powerbox-target')).to.equal(
      'petname-if-known',
    );
    expect(inner.getAttribute('data-powerbox-id')).to.equal('AG.1');
    expect(inner.innerText).to.equal('AG.1');
  });
});
