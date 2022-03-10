/* eslint-disable no-underscore-dangle,import/no-extraneous-dependencies */
import '../demo/install-ses-lockdown.js';
import { E } from '@agoric/eventual-send';
import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';

import { Server } from 'mock-socket/dist/mock-socket.es';
import { makeAgoricWalletConnection } from '../src/AgoricWalletConnection.js';
import { makeAgoricIframeMessenger } from '../src/AgoricIframeMessenger.js';

let iframeMessenger;
const iframeOnMessage = data => {
  // Pretend we have a message from the iframe.
  const ev = {
    data,
    source: iframeMessenger._contentWindow,
    preventDefault: () => {},
  };
  return iframeMessenger._onMessage(ev);
};

const captpInnards = {
  send: () => {},
  lastDispatched: undefined,
  isAborted: false,
};

// Expose the innards of the captp object for testing.
const makeMockCapTP = (_, rawSend, __, ___) => {
  captpInnards.send = rawSend;
  captpInnards.lastDispatched = undefined;
  captpInnards.isAborted = false;

  return {
    dispatch: data => (captpInnards.lastDispatched = data),
    abort: () => (captpInnards.isAborted = true),
    getBootstrap: () => ({
      bridge: true,
      loadingNotifier: {
        getUpdateSince: () => ({ updateCount: 3, value: [] }),
      },
      wallet: {
        getAdminFacet: () => ({ isAdmin: true }),
      },
    }),
  };
};

// Expose the iframe messenger instance used by the wallet connection.
customElements.define(
  'agoric-iframe-messenger',
  makeAgoricIframeMessenger(that => (iframeMessenger = that)),
);

// Expose the captp innards for the wallet connection.
customElements.define(
  'agoric-wallet-connection',
  makeAgoricWalletConnection(makeMockCapTP),
);

describe('AgoricWalletConnection', () => {
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
    let stateResolvers;

    const onState = ev => {
      if (ev.detail.state in stateResolvers) {
        stateResolvers[ev.detail.state]();
      }
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

    const createStatePromise = state => {
      const statePromise = new Promise(
        resolve => (stateResolvers[state] = resolve),
      );

      return Promise.race([
        statePromise,
        new Promise(resolve => setTimeout(() => resolve('timeout'), 2000)),
      ]);
    };

    beforeEach(async () => {
      stateResolvers = {};
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
      iframeOnMessage('http://localhost:8000');

      expect(el.state).to.equal('connecting');
    });

    it('goes to admin state once connected', async () => {
      iframeOnMessage('http://localhost:8000');

      await createStatePromise('bridged');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(el.state).to.equal('bridged');
    });

    it('lets the websocket dispatch messages through capTP', async () => {
      iframeOnMessage('http://localhost:8000');

      socket.send(JSON.stringify({ foo: 'bar' }));

      expect(captpInnards.lastDispatched).to.deep.equal({ foo: 'bar' });
    });

    it('lets capTP send messages through the websocket', async () => {
      iframeOnMessage('http://localhost:8000');
      await new Promise(resolve => setTimeout(resolve, 100));

      captpInnards.send({ foo: 'bar2' });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(lastMessage).to.equal(JSON.stringify({ foo: 'bar2' }));
    });

    it('aborts capTP when the socket disconnects', async () => {
      iframeOnMessage('http://localhost:8000');

      socket.close();

      expect(captpInnards.isAborted).to.equal(true);
    });

    it('returns the admin bootstrap', async () => {
      iframeOnMessage('http://localhost:8000');

      expect(await adminBootstrap).to.deep.equal({ isAdmin: true });
    });
  });

  it(`can't override the state`, async () => {
    const el = await fixture(
      html` <agoric-wallet-connection></agoric-wallet-connection> `,
    );
    expect(el.state).to.equal('idle');
    expect(() => (el.state = 'notset')).to.throw(/Cannot set/);
  });

  it('passes the a11y audit', async () => {
    const el = await fixture(
      html` <agoric-wallet-connection></agoric-wallet-connection> `,
    );

    await expect(el).shadowDom.to.be.accessible();
  });
});
