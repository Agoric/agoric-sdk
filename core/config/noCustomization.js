import harden from '@agoric/harden';

// These methods do no customization; they just return the original
// parameter. In other configurations, these methods would be used to
// add custom methods (or otherwise customize) payments, purses, etc.

// These methods must be paired with a mintKeeper and DescOps to be a
// full configuration that can be passed into `makeMint`.
const noCustomization = harden({
  makePaymentTrait(_superPayment) {
    return harden({});
  },
  makePurseTrait(_superPurse) {
    return harden({});
  },
  makeMintTrait(_superMint) {
    return harden({});
  },
  makeAssayTrait(_superAssay) {
    return harden({});
  },
});

export { noCustomization };
