# Contributing to portfolio-contract aka ymax0

Thanks for your interest in improving YMax! This package is in a proof-of-concept stage, iterating rapidly.

 - `README.md` - user-level description of the contract.
 - `src/`
    - `portfolio.contract.ts` - contract `start` function
    - `type-guards.ts` - staic types for the external interface along
      with (dynamic) pattern guards, aka shapes
    - `constants.js` - enumerated constants
    - `portfolio.exo.ts` - durable object for portfolio state
    - `portfolio.flows.ts` - orchestration flows for opening and
      managing portfolios
 - `test/` - tests for contract, flows, etc.
 - `tools/` - utilities exported for use in other packages

## Code Quality & Testing

As usual for Agoric packages, check your contributions with:

```sh
yarn test
yarn lint
```

Our [unit testing conventions](https://github.com/Agoric/agoric-sdk/wiki/agoric-sdk-unit-testing) are based on `ava` and [coding style](https://github.com/Agoric/agoric-sdk/wiki/Coding-Style) is based on Airbnb style.

While [tooling to enforce consistent import ordering #7403](https://github.com/Agoric/agoric-sdk/issues/7403) is not yet in place, please use **Organize Imports** regularly.

## Deployment is out of scope

The `@aglocal/portfolio-deploy` package takes care of deployment. It depends on this package.
This package does *not* depend on it.

## Based on experience building Fast USDC

Building `@aglocal/fast-usdc-contract` provided lots of experience that's useful in this package.

For example, this package takes advantage of emerging support for typescript that was pioneered in Fast USDC. With the exception of `constants.js`, there's no need for [putting types in JSDoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html).

Fast USDC in turn builds on
 - the Agoric Orchestration SDK (aka API),
 - and the Zoe smart contract platform, and
 - the endo distributed computing platform

### `TypedPattern`s

In particular, we make extensive use of `@endo/patterns` aka shapes, especially `TypedPattern<T>`
for data validation.

```ts
import {
  mustMatch, // the `mustMatch` in @endo/patterns doesn't do TypedPattern yet
  type TypedPattern,
} from '@agoric/internal';

type GoodStuff = { type: 'good', size: NatValue };
// Take care to keep the shape/pattern in sync with the type!
const GoodStuffShape: TypedPattern<GoodStuff> = M.splitRecord({ type: 'good', size: M.nat() });

const workWithExternalData = (data: unknown) => {
  mustMatch(data, GoodStuffShape);
  // now we know data is of type GoodStuff
  const { size } = data;
}
```

Note that while the `GoodStuffShape` pattern/shape is a value, we use an initial uppercase letter like the type, `GoodStuff`.

### Offer Safety Limitations

While support for Offer Safety in the Orchestration SDK is a goal with work-in-progress ([#10504 ERTP face on orch assets](https://github.com/Agoric/agoric-sdk/pull/10504)), currently, the use of basic orchestration features such as `acct.localTransfer(seat, ...)` moves assets out of the Zoe-managed seat before any `want:` might be satisfied.
