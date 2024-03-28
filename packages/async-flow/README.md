# `@agoric/async-flow`

***Beware that this module may migrate to the endo repository as `@endo/async-flow`.***


Upgrade while suspended at `await` points! Uses membrane to log and replay everything that happened before each upgrade.

In the first incarnation, somewhere, using a ***closed*** async function argument
```js
const wrapperFunc = asyncFlow(
  zone,
  'funcName`,
  async (...) => {... await ...; ...},
);
```
then elsewhere, as often as you'd like
```js
const outcomeVow = wrapperFunc(...);
```

For all these `asyncFlow` calls that happened in the first incarnation, in the first crank of all later incarnations
```js
asyncFlow(
  zone,
  'funcName`,
  async (...) => {... await ...; ...},
);
```
with async functions that reproduce the original's logged behavior. In these later incarnations, you only need to capture the returned `wrapperFunc` if you want to create new activations. Regardless, the old activations continue.
