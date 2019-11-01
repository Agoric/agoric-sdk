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
    yield harden({
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
  yield harden({
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
pattern](https://en.wikipedia.org/wiki/Trait_%28computer_programming%29),
in which custom behavior can be defined and recombined easily.
Furthermore, if we always combine the methods such that the "core"
methods are last, they cannot be overridden by the custom methods.

## Why generator functions?

To use the trait pattern defensively, we must arrange for robust self-reference. In the examples above, the trait code does not refer to the object itself. But we also define traits like

```js
function* makePaymentTrait(_corePayment, assay) {
  const payment = yield harden({
    // This creates a new use object which destroys the payment
    unwrap: () => makeUseObjForPayment(assay, payment),
  });
}
```

Above, the `payment` object is the actual payment to which this trait contributes the `unwrap` method. We introduce this peculiar generator pattern to solve this self-reference problem. The `payment` variable refers to the object as a whole. However, the object-as-a-whole is not yet assembled, and will be assembled only by a distinct piece of code written in a distinct scope.

In the generator function pattern shown above, the trait methods of a given layer are defined in the scope of the `payment` variable bound on the left of the yield. The `payment` variable is bound to the value that the yield returns. However, before that happens, the generator yields the argument to yield, which is the object containing the trait's methods, to be combined to make the object itself. The pattern above containing `makeMintTraitIter` first runs one step of the trait generator to obtain the trait methods, combining them into the overall object. Only when the object is complete does it go back to the generator, in order to bind that object to that trait's variable for the object itself, such as `payment`.

This is an ad-hoc version of a special case for supporting trait composition. See [Making Layer Cakes](https://github.com/Agoric/layer-cake) for our draft of a reusable library for supporting such patterns of trait composition. When it is ready we expect to switch to it.
