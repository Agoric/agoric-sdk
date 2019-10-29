## Custom Mints and Other Configurations

The `makeMint` function in `assays.js` takes in a configuration
function that can change a number of things about how mints, assays,
purses, and payments are made. 

By default, `makeBasicFungibleConfig` is used. This creates a mint for
a fungible token with no custom methods.

But, imagine that we want to add a custom method to the `mint` object.
Maybe we want to be able to know how much has been minted so far. To
do so, we will need to create our own custom configuration. 

Our custom configuration will look like this:

```js
const makeTotalSupplyConfig = () => {

  function* makePaymentTrait(_corePayment) {
    yield harden({});
  }

  function* makePurseTrait(_corePurse) {
    yield harden({});
  }

  function* makeMintTrait(_coreMint, _assay, _assay, mintKeeper) {
    return yield harden({
      getTotalSupply: () => mintKeeper.getTotalSupply(),
    });
  }

  function* makeAssayTrait(_coreAssay) {
    yield harden({});
  }

  return harden({
    makePaymentTrait,
    makePurseTrait,
    makeMintTrait,
    makeAssayTrait,
    makeMintKeeper: makeTotalSupplyMintKeeper,
    extentOps: natExtentOps,
    makeMintTrait,
  });
};
```

In this custom configuration, we've done two things: we've added a
method to `mint` called `getTotalSupply`, and we've changed the
`mintKeeper` to a custom mintKeeper that keeps track of the total
supply for us (more on this in separate documentation). 

Let's take a look into how we are able to add new methods to mints,
assays, purses, and payments. 

In `makePaymentTrait`, we take `corePayment` as a parameter. The
`corePayment` is constructed in `assays.js` and has all of the
methods we are familiar with:

```js
const corePayment = harden({
  getAssay() {
    return assay;
  },
  getBalance() {
    return paymentKeeper.getUnits(payment);
  },
  getName() {
    return name;
  },
});
```

Our custom code, `makePaymentTrait`, returns an object with custom methods.
These methods will be added to the `corePayment`. For this particular
customization, we want to leave payments alone, so we will create a
generator function that yields an empty object:

```js
function* makePaymentTrait(_corePayment) {
  yield harden({});
}
```

However, we do want to add an extra method to mints. So,
`makeMintTrait` is defined as:

```js
function* makeMintTrait(_coreMint, _assay, _assay, mintKeeper) {
  return yield harden({
    getTotalSupply: () => mintKeeper.getTotalSupply(),
  });
}
```

Back in `assays.js`, our custom methods will be combined with the
"core" methods already present. Here's how that works for our custom
mint methods:

```js
const makeMintTraitIter = makeMintTrait(coreMint, assay, assay, mintKeeper);
const mintTrait = makeMintTraitIter.next().value;
const mint = harden({
  ...mintTrait,
  ...coreMint,
});
makeMintTraitIter.next(mint);
```

## The Trait Pattern

We want the core behavior of mints, assays, purses and payments to be
consistent and reliable across different types of assets. On the other
hand, we do know that there is a genuine need to have slightly
different purposes expressed.

This is why we've chosen to use the [Trait
pattern](https://en.wikipedia.org/wiki/Trait_(computer_programming)),
in which custom behavior can be defined and recombined easily.
Furthermore, if we always combine the methods such that the "core"
methods are last, they cannot be overridden by the custom methods. 

So we're good, right? Well, almost.

## Why generator functions?

Sometimes, we want to burn the payment in the custom method. That
caused a problem because with normal functions we don't actually have
access to the full payment, the one which is built by adding methods to the
`corePayment`. We only have access to the `corePayment` that
is passed in as a parameter. When we call `assay.burnAll(payment)`,
the payment gets looked up in a WeakMap of all the payments and their
current balances. However, the corePayment won't be in that WeakMap.
The finished payment (the corePayment plus the custom methods) is what
is in the WeakMap. So we must have access to *that* payment. 

There's a contradiction there. We wanted to ensure that the custom
code couldn't override or mess with the core methods, but now we're
saying that we should hand off the whole, un-`hardened` payment to the
custom code. 

There's a way to get around this contradiction: generator functions.
We can still use the trait pattern. However, we can also give access
to the `hardened`, final version of the payment that is the core + custom methods.

Here's how that happens:

* temporal dead zone
* ??
