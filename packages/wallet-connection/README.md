# \<agoric-wallet-connection>

This webcomponent follows the [open-wc](https://github.com/open-wc/open-wc)
recommendations.

## Installation

```bash
yarn add @agoric/wallet-connection ses @agoric/eventual-send
```

## Usage

This component works with modern browsers using any framework that supports
standard Web Components.  The only popular framework that needs additional help
to use Web Components is ReactJS, for which we provide a [React-specific wrapper](#ReactJS).

### Setup

You will need to ensure your app first installs and locks down the JS
environment using
[SES](https://github.com/endojs/endo/tree/master/packages/ses#readme).

You can create an `install-ses-lockdown.js` module that does all the setup
needed by your app:

```js
/* global lockdown */
import 'ses'; // adds lockdown, harden, and Compartment
import '@agoric/eventual-send/shim.js'; // adds support needed by E

// Help lock down the JS environment.  The start compartment (current evaluation context)
// can still access powerful globals, but this start compartment can use `new Compartment(...)`
// to evaluate code with stricter confinement.
lockdown({
  errorTaming: 'unsafe',
  overrideTaming: 'severe',
});

Error.stackTraceLimit = Infinity;
```

In all apps, you will need to import the above file to enable the RPC
environment that `agoric-wallet-connection` uses:

```js
// Ensure this is imported before anything else in your project.
import './install-ses-lockdown.js';
```

Somewhere else, you will need to define custom event handlers:

```js
import { E } from '@agoric/eventual-send';

// This will possibly run multiple times whenever `.connecting` is set.
const onOpen = ev => {
  // You should reconstruct all state here, given that the wallet is only now freshly open.
  console.log('Agoric wallet connected');

  // This is one of the only methods that the wallet facet allows.
  /** @type {ERef<WalletBridge>} */
  const walletBridge = E(ev.wallet).getScopedBridge('My dapp', window.location.origin);
  // Now use the WalletBridge as desired.
  const zoe = E(walletBridge).getZoe();
  // ...
};

// This will run for every notable error, maybe multiple times per wallet connection.
const onError = ev => {
  console.error('Agoric wallet got connection error', ev.message);
};

// This will run every time the wallet connection closes, including if the
// latest connection attempt has failed to open.
// If `.connecting` is still set after this callback, then the connection will retry.
const onClose = ev => {
  // Clean up app state since the wallet connection is closed.
  console.log('Agoric wallet closed', ev.code, ev.reason);
};
```

### Vanilla JS

This is an example of how to use the wallet connection in plain HTML:

```html
<agoric-wallet-connection></agoric-wallet-connection>

<button>Connect to Wallet</button>

<script type="module">
  import './install-ses-lockdown.js';
  import '@agoric/wallet-connection/agoric-wallet-connection.js';

  // Set up event handlers.
  const awc = document.querySelector('agoric-wallet-connection');
  awc.addEventListener('open', onOpen);
  awc.addEventListener('error', onError);
  awc.addEventListener('close', onClose);

  // Configure the listener.
  document.querySelector('button').addEventListener(ev => {
    // Start the wallet connection.
    // Will retry until `.connecting` is explicitly set to `false`.
    awc.connecting = true;
  });
</script>
```

### ReactJS

This is an example of how to use the wallet connection from
[React](https://reactjs.org).

```js
import React, { useCallback } from 'react';
import { makeReactAgoricWalletConnection } from '@agoric/wallet-connection/react.js';

// Create a wrapper for agoric-wallet-connection that is specific to
// the app's instance of React.
const AgoricWalletConnection = makeReactAgoricWalletConnection(React);

const MyWalletConnection = ({ connecting }) => {
  const onOpen = useCallback(ev => { /* use ev.wallet */ }, []);
  const onClose = useCallback(ev => { /* use ev.code, ev.reason */ }, []);
  const onError = useCallback(ev => { /* use ev.message */ }, []);
  return (
    <AgoricWalletConnection
      connecting={connecting}
      onOpen={onOpen}
      onClose={onClose}
      onError={onError}
    />
  );
}
```

### Other frameworks

Please look up documentation on how to use your framework with Web Components.
If you have a working example of how to do so, please consider submitting a PR
against this README.md to help others learn.

## Linting and formatting

To scan the package for linting and formatting errors, run

```bash
yarn lint
```

To automatically fix linting and formatting errors, run

```bash
yarn format
```

## Testing with Web Test Runner

To execute a single test run:

```bash
yarn test
```

To run the tests in interactive watch mode run:

```bash
yarn test:watch
```


## Tooling configs

For most of the tools, the configuration is in the `package.json` to minimize
the amount of files in this package.

## Local Demo with `web-dev-server`

```bash
yarn start
```

To run a local development server that serves the basic demo located in `demo/index.html`
