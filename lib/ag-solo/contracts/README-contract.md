This folder contains contracts that are bundled and installed when ag-solo first starts.

## Zoe uploads

Each Zoe contract entrypoint is named `zoe-NAME.js`, where **NAME** is an identifier.  These files are ES modules which can import other modules.  The direct exports from `zoe-NAME.js` become properties on **NAME**'s installation.

Note that the `makeContract` export accepts a pureFns argument and returns a function that receives a Zoe instance as an argument.

```js
export const makeContract = harden(_pureFns => zoe => { ... });
```

The following global variables are available to all modules in your Zoe contract:

* harden
* makePromise
* insist

## Legacy contractHost uploads

Each contract entrypoint is named `contract-NAME.js`, where **NAME** is an identifier.  These files are ES modules which can import other modules, and whose default export is:

```js
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

And until these are importable from an ERTP ES module:
* sameStructure
* mustBeSameStructure

## Uploading

The upload process installs the contract and registers the installation as `NAME#nnn` in the object registry (either on or off-chain).  This process can be run at any time by using ag-solo's upload-contract functionality:

```sh
ag-solo upload-contract NAME=ENTRYPOINT.js [NAME=ENTRYPOINT.js...]
# To create contract instance, use:
#   home.registry~.get(ID)~.spawn(TERMS)
# where ID is the registered installation id, one of:
#   NAME#nnn
```

The numeric suffix **nnn** is chosen by the registry to make a unique ID.

Again, note that all the `contract-*.js` in this directory are automatically uploaded when ag-solo first starts.
