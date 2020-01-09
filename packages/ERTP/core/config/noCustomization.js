import harden from '@agoric/harden';

// These methods do no customization; they just return the original
// parameter. In other configurations, these methods would be used to
// add custom methods (or otherwise customize) payments, purses, etc.

// These methods must be paired with a mintKeeper and UnitOps to be a
// full configuration that can be passed into `makeMint`.

function makePaymentTrait(makeMintContext){
  return _corePayment => harden({});
}

function makePurseTrait(makeMintContext) {
  return _corePurse => harden({});
}

function makeMintTrait(makeMintContext) {
  return _coreMint => harden({});
}

function makeAssayTrait(makeMintContext) {
  return _coreAssay => harden({});
}

const noCustomization = harden({
  makePaymentTrait,
  makePurseTrait,
  makeMintTrait,
  makeAssayTrait,
});

export { noCustomization };
