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

---

> [!IMPORTANT]
> The async function argument should be ***closed***, meaning that it should not use any lexically captured variables other than powerless globals. Any direct access to mutable state or ability to cause effects may introduce bugs, since these effects will happen again under replay outside the control of the asyncFlow isolation and deterministic replay mechanisms.
>
> We make an explicit exception for `console`, since log messages sent to `console` are only for diagnostic purposes, and `console` as a whole is write-only. During replay, such out-of-band console log events may appear again. For the same reason, the async function has no obligation to reproduce previous runs of such out-of-band console logging events, since they are outside the replay mechanisms.
