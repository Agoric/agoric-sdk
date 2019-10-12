This folder contains contracts that are bundled and installed when ag-solo first starts.

Each contract entrypoint is named `contract-NAME.js`, where **NAME** is any kind of identifier.  These files are ES modules which can import other modules, and whose default export is:

```js
// This function is called to instantiate a contract.
export default harden((terms, inviteMaker) => ...);

// Check function available via the installation.
export const checkMyInvariant = harden((installation, ...) => ...);
```

The following global variables are available to all modules in your contract:
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

The numeric suffix **nnn** is chosen to make a unique ID by the registry.
