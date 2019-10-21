This folder contains contracts that can be bundled and installed after ag-solo starts.

## Zoe uploads

Each Zoe contract entrypoint is named `zoe-NAME.js`, where **NAME** is an identifier.  These files are ES modules which can import other modules.  The direct exports from `zoe-NAME.js` become properties on **NAME**'s installation.

Note that the `makeContract` export accepts a Zoe instance as an argument.

```js
import harden from '@agoric/harden';

export const makeContract = harden(zoe => { ... });
```

The following global variables are available to all modules in your Zoe contract:

* harden
* makePromise
* insist

## Legacy contractHost uploads

Each contractHost entrypoint is named `contractHost-NAME.js`, where **NAME** is an identifier.  These files are ES modules which can import other modules, and whose default export is:

```js
import harden from '@agoric/harden';

// This function is called to instantiate a contract.
export default harden((terms, inviteMaker) => ...);

// Optional "check*" export available via the installation.
export const checkMyInvariant = harden((installation, ...) => ...);
```

The following global variables are available to all modules in your contractHost contract:
* Nat
* harden
* console
* E
* makePromise
* sameStructure
* mustBeSameStructure

## Uploading

The upload process installs the contract and registers the installation as `NAME` in the `home.uploads` private scratch pad.  This process can be run at any time by using ag-solo's upload-contract functionality:

```sh
ag-solo upload-contract NAME=ENTRYPOINT.js [NAME=ENTRYPOINT.js...]
```

To access the contract installation object, use `home.uploads~.get(NAME)`.

To list all contracts in the uploads scratch pad: `home.uploads~.list()`.
