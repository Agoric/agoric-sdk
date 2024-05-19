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

## Loopholes for purely diagnostic information
>
> We make an explicit exception to the closed-function requirement for `console`, since log messages sent to `console` are only for diagnostic purposes, and `console` as a whole is write-only. We consider the ability to read the console log output to be similar to the ability to view computation through a debugger. Not counting either as "observing effects", the `console` does not cause "observable effects". During replay, such out-of-band console log events may appear again. For the same reason, the async function has no obligation to reproduce previous runs of such out-of-band console logging events, since they are outside the replay mechanisms. Likewise, the guest function has no obligation to reproduce the experience of viewing it through a debugger.

> When comparing arguments sent by the guest function during replay with what the log recorded the guest function to have sent, we are extremely permissive in judging whether a sent error is the "same" as it was on a previous run. We only care that it is an error, and that the value of the `error.name` property is the same string. That string is normally the name of the error "class", such as `TypeError` or `URIError`, and is the only aspect of an error that programs may legitimately use to make a semantically significant decision. Everything else carried by an error, expecially its `error.message`, call-stack information, and subsidiary errors, are only for diagnostic purposes and need not be the same on replay.
