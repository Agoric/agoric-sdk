# \<agoric-wallet-connection>

This webcomponent follows the [open-wc](https://github.com/open-wc/open-wc)
recommendations.

## Installation

```bash
yarn add @agoric/wallet-connection ses @endo/eventual-send
```

## Usage

This component works with modern browsers using any framework that supports
standard Web Components. The only popular framework that needs additional help
to use Web Components is ReactJS, for which we provide a [React-specific wrapper](#ReactJS).

### Setup

You will need to ensure your app first installs and locks down the JS
environment using
[SES](https://github.com/endojs/endo/blob/master/packages/ses/README.md).

You can create an `install-ses-lockdown.js` module that does all the setup
needed by your app:

```js
/* global lockdown */
import 'ses'; // adds lockdown, harden, and Compartment
import '@endo/eventual-send/shim.js'; // adds support needed by E

// Help lock down the JS environment.  The start compartment (current evaluation context)
// can still access powerful globals, but this start compartment can use `new Compartment(...)`
// to evaluate code with stricter confinement.
lockdown({
  errorTaming: 'unsafe', // Should use 'safe' in production mode.
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

Or, in your `index.html`:

```html
<script src="lockdown.umd.js"></script>
<script>
  lockdown({
    errorTaming: 'unsafe',
    overrideTaming: 'severe',
  });
</script>
```

Where `lockdown.umd.js` can be brought in with a script like:

```js
    "build:ses": "cp ./node_modules/ses/dist/lockdown.umd.js public/"
```

([example](https://github.com/Agoric/agoric-sdk/pull/3879/files))

Somewhere else, you will need to define a custom state event handler:

```js
import { E } from '@endo/eventual-send';

const onWalletState = ev => {
  const { walletConnection, state } = ev.detail;
  console.log('onWalletState', state);
  switch (state) {
    case 'idle': {
      console.log('idle', ev.detail);

      // This is one of the only methods that the wallet connection facet allows.
      // It connects asynchronously, but you can use promise pipelining immediately.
      /** @type {ERef<WalletBridge>} */
      const bridge = E(walletConnection).getScopedBridge('my dapp');

      // You should reconstruct all state here.
      const zoe = E(bridge).getZoe();
      // ...
      break;
    }
    case 'error': {
      console.log('error', ev.detail);
      // In case of an error, reset to 'idle'.
      // Backoff or other retry strategies would go here instead of immediate reset.
      E(walletConnection).reset();
      break;
    }
    default:
  }
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
  awc.addEventListener('state', onWalletState);

  // You're free to use the wallet connection object directly:
  E(awc.walletConnection).getScopedBridge('my dapp');
  // ...
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
  const onWalletState = useCallback(ev => {
    /* similar to above */
  }, []);
  return <AgoricWalletConnection onState={onWalletState} />;
};
```

To use `ses` in React, it's best to load it in `index.html` as shown above. It
requires `consoleTaming` should be set to `unsafe` to make dev-mode work:

```html
<script src="lockdown.umd.js"></script>
<script>
  // Allow the React dev environment to extend the console for debugging
  // features.
  const consoleTaming = '%NODE_ENV%' === 'development' ? 'unsafe' : 'safe';
  const errorTaming = '%NODE_ENV%' === 'development' ? 'unsafe' : 'safe';

  lockdown({
    consoleTaming,
    errorTaming,
    overrideTaming: 'severe',
  });
</script>
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
