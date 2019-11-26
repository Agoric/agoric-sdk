import harden from '@agoric/harden';

// These methods do no customization; they just return the original
// parameter. In other configurations, these methods would be used to
// add custom methods (or otherwise customize) payments, purses, etc.

// These methods must be paired with a mintKeeper and UnitOps to be a
// full configuration that can be passed into `makeMint`.

function* makePaymentTrait(_corePayment) {
  yield harden({});
}

function* makePurseTrait(_corePurse) {
  yield harden({});
}

function* makeMintTrait(_coreMint) {
  yield harden({});
}

function* makeAssayTrait(_coreAssay) {
  yield harden({});
}

const noCustomization = harden({
  makePaymentTrait,
  makePurseTrait,
  makeMintTrait,
  makeAssayTrait,
});

export { noCustomization };
