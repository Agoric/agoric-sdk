In brief:

 - exported functions should only depend on their arguments. I/O, clocks, random number generators and such should be injected. ([#2160](https://github.com/Agoric/agoric-sdk/issues/2160))
   - default args that the caller can override provide a transitional approach ([#10038](https://github.com/Agoric/agoric-sdk/issues/10038))
   - modules should **not** export powerful objects (for example, objects that close over `fs` or `process.env`)
   - static mutable state should be avoided

 - program scripts are indicated with `#!/usr/bin/env node` at the top (and +x file permissions). They are free to import all the authority they need and then delegate it.

 - [test scripts](https://github.com/Agoric/agoric-sdk/wiki/agoric-sdk-unit-testing) are named `*.test.{js,ts}`.  Note that tests don't export anything.

## Background

A key to cooperation without vulnerability is _object capability discipline_, which consists of:

* **Memory safety and encapsulation**: There is no way to get a reference to an object except by creating one or being given one at creation or via a message; no casting integers to pointers, for example.  
  From outside an object, there is no way to access the internal state of the object without the object’s consent (where consent is expressed by responding to messages).</dd>

* **Primitive effects only via references** The only way an object can affect the world outside itself is via references to other objects. All primitives for interacting with the external world are embodied by primitive objects and **anything globally accessible is immutable data.** There is no `open(filename)` function in the global namespace, nor can such a function be imported -- converting a string to file access is much like converting an integer to a pointer.

Object Capabilities are often abbreviated as OCaps; hence **OCap discipline**.

On [the Agoric platform](https://agoric.com/documentation/platform/), OCap discipline is enforced on contracts.

While JavaScript platforms (browsers, node) don't enforce OCap discipline in general, [SES](https://agoric.com/documentation/guides/js-programming/ses/ses-guide.html#what-is-ses) lets us layer it on top.

## Examples

### Injecting I/O and Authority

```js
// BAD: Ambient authority (violates OCap discipline)
export const getTime = () => Date.now();

// GOOD: Require authority to be passed explicitly (OCap discipline)
export const doSomething = now => {
  // ...
  const t = now();
  // ...
};
```

### Injecting Randomness

```js
// BAD: Uses global random source
import { Random } from '@cosmjs/crypto';
export const makeMnemonic = () => generateMnemonic(Random.getBytes);

// GOOD: Inject random source
export const makeMnemonic = getBytes => generateMnemonic(getBytes);
```

### Injecting Credentials or Secrets

```js
// BAD: Hardcoded or ambient mnemonic
export const createWallet = () => createWalletWithMnemonic(process.env.MNEMONIC);

// GOOD: Inject mnemonic as argument
export const createWallet = mnemonic => createWalletWithMnemonic(mnemonic);
```

### Injecting Powerful Functions

```js
// BAD: Uses imported powerful function directly
import { SigningStargateClient } from '@cosmjs/stargate';
export const connect = async (endpoint, wallet) =>
  SigningStargateClient.connectWithSigner(endpoint, wallet);

// GOOD: Inject powerful function
export const connect = async (endpoint, wallet, connectWithSigner) =>
  connectWithSigner(endpoint, wallet);
```

### Transitional Patterns

These patterns allow, but do not require, OCap discipline. They are provided for backward compatibility and are tracked by [#10038](https://github.com/Agoric/agoric-sdk/issues/10038).

```js
// Transitional: allow, but don't require OCap (#10038)
export const doSomething = (now = Date.now) => {
  // ...
  const t = now();
  // ...
};

export const makeMnemonic = (getBytes = Random.getBytes) => generateMnemonic(getBytes);

export const connect = async (
  endpoint,
  wallet,
  connectWithSigner = SigningStargateClient.connectWithSigner,
) => connectWithSigner(endpoint, wallet);
```

## References
 - 2006-05: Miller, M.S.: [Robust Composition: Towards a Unified Approach to Access Control and Concurrency Control](http://erights.org/talks/thesis/index.html). PhD thesis, Johns Hopkins University, Baltimore, Maryland, USA
   - See also [a history of E’s ideas](http://www.erights.org/history/index.html).

See also;
 - [Capability\-based security \- Wikipedia](https://en.wikipedia.org/wiki/Capability-based_security)
 - [Ambient authority \- Wikipedia](https://en.wikipedia.org/wiki/Ambient_authority)

