import '../demo/install-ses-lockdown.js';
import { E } from '@agoric/eventual-send';
import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';

import { Server } from 'mock-socket/dist/mock-socket.es';
import { makeAgoricWalletConnection } from '../src/agoric-wallet-connection.js';
import { makeMockAgoricIframeMessenger } from './src/mock-agoric-iframe-messenger.js';
import { MockCapTP } from './src/mock-cap-tp.js';

/**
 * @type {import('./src/mock-agoric-iframe-messenger.js').MockIframeController}
 */
const iframeController = {};
window.iframeController = iframeController;

let mockCapTP;
const makeMockCapTP = (_, rawSend, __, ___) => {
  mockCapTP = new MockCapTP(rawSend);
  return {
    dispatch: data => mockCapTP.dispatch(data),
    abort: () => mockCapTP.abort(),
    getBootstrap: () => mockCapTP.getBootstrap(),
  };
};

customElements.define(
  'agoric-wallet-connection',
  makeAgoricWalletConnection(
    () => makeMockAgoricIframeMessenger('iframeController'),
    makeMockCapTP,
  ),
);

describe('AgoricWalletConnection', () => {
  // eslint-disable-next-line no-unused-vars
  let mockServer;
  let socket;
  let lastMessage;

  beforeEach(() => {
    mockServer = new Server('ws://localhost:8000/private/captp');
    mockServer.on('connection', s => {
      socket = s;
      socket.on('message', data => (lastMessage = data));
    });
  });

  afterEach(() => {
    mockServer.stop();
  });

  it(`has a default state of 'idle' and has a walletConnection`, async () => {
    const onState = ev => {
      expect(ev.detail.state).to.equal('idle');
    };
    const el = await fixture(
      html`
        <agoric-wallet-connection @state=${onState}></agoric-wallet-connection>
      `,
    );

    expect(el.walletConnection).not.undefined;
  });

  it('transitions on getScopedBridge', async () => {
    const onState = ev => {
      switch (ev.detail.state) {
        case 'idle': {
          E(ev.detail.walletConnection).getScopedBridge('My Dapp');
          break;
        }
        default:
      }
    };

    const el = await fixture(
      html`
        <agoric-wallet-connection @state=${onState}></agoric-wallet-connection>
      `,
    );
    expect(el.state).to.equal('locating');
  });

  describe('on getAdminBootstrap', () => {
    let el;
    let adminBootstrap;

    const onState = ev => {
      switch (ev.detail.state) {
        case 'idle': {
          adminBootstrap = E(ev.detail.walletConnection).getAdminBootstrap(
            'accessToken123',
          );
          break;
        }
        default:
      }
    };

    beforeEach(async () => {
      el = await fixture(
        html`
          <agoric-wallet-connection
            @state=${onState}
          ></agoric-wallet-connection>
        `,
      );
    });

    it('starts at locating', () => {
      expect(el.state).to.equal('locating');
    });

    it('starts connecting after locating completes', () => {
      iframeController.ref.onMessage('http://localhost:8000');

      expect(el.state).to.equal('connecting');
    });

    it('goes to admin state once connected', async () => {
      iframeController.ref.onMessage('http://localhost:8000');

      // Connecting happens instantly with the mock socket,
      // just need to let the event loop run once.
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(el.state).to.equal('admin');
    });

    it('lets the websocket dispatch messages through capTP', async () => {
      iframeController.ref.onMessage('http://localhost:8000');
      await new Promise(resolve => setTimeout(resolve, 10));

      socket.send(JSON.stringify({ foo: 'bar' }));
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCapTP.lastDispatched).to.deep.equal({ foo: 'bar' });
    });

    it('lets capTP send messages through the websocket', async () => {
      iframeController.ref.onMessage('http://localhost:8000');
      await new Promise(resolve => setTimeout(resolve, 10));

      mockCapTP.send({ foo: 'bar' });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(lastMessage).to.equal(JSON.stringify({ foo: 'bar' }));
    });

    it('aborts capTP when the socket disconnects', async () => {
      iframeController.ref.onMessage('http://localhost:8000');
      await new Promise(resolve => setTimeout(resolve, 10));

      socket.close();

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockCapTP.isAborted).to.equal(true);
    });

    it('returns the admin bootstrap', async () => {
      iframeController.ref.onMessage('http://localhost:8000');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(await adminBootstrap).to.deep.equal({ foo: 'bar' });
    });
  });

  it(`can't override the state`, async () => {
    const el = await fixture(
      html`
        <agoric-wallet-connection></agoric-wallet-connection>
      `,
    );
    expect(el.state).to.equal('idle');
    expect(() => (el.state = 'foo')).to.throw(/Cannot set/);
  });

  it('passes the a11y audit', async () => {
    const el = await fixture(
      html`
        <agoric-wallet-connection></agoric-wallet-connection>
      `,
    );

    await expect(el).shadowDom.to.be.accessible();
  });
});
