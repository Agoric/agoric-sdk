import '../demo/install-ses-lockdown.js';
import { E } from '@agoric/eventual-send';
import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';

import '../agoric-wallet-connection.js';

describe('AgoricWalletConnection', () => {
  it(`has a default state of 'idle' and has a walletConnection`, async () => {
    const onState = ev => {
      expect(ev.detail.state).to.equal('idle');
    };
    const el = await fixture(html`<agoric-wallet-connection @state=${onState}></agoric-wallet-connection>`);

    expect(el.walletConnection).not.undefined;
  });

  it('transitions on getScopedBridge', async () => {
    const onState = ev => {
      switch (ev.detail.state) {
        case 'idle': {
          E(ev.detail.walletConnection).getScopedBridge('My Dapp');
          break;
        }
      }
    };

    const el = await fixture(html`<agoric-wallet-connection @state=${onState}></agoric-wallet-connection>`);
    expect(el.state).to.equal('locating');
  });

  it(`can't override the state`, async () => {
    const el = await fixture(html`<agoric-wallet-connection></agoric-wallet-connection>`);
    expect(el.state).to.equal('idle');
    expect(() => el.state = 'foo').to.throw(/Cannot set/);
  });

  it('passes the a11y audit', async () => {
    const el = await fixture(html`<agoric-wallet-connection></agoric-wallet-connection>`);

    await expect(el).shadowDom.to.be.accessible();
  });
});
