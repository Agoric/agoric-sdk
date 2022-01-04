import { AssetKind } from '@agoric/ertp';

// TODO: phase out ./issuers.js
export const CENTRAL_ISSUER_NAME = 'RUN';

export const feeIssuerConfig = {
  name: CENTRAL_ISSUER_NAME,
  assetKind: AssetKind.NAT,
  displayInfo: { decimalPlaces: 6, assetKind: AssetKind.NAT },
  initialFunds: 1_000_000_000_000_000_000n, // ISSUE: we can't make RUN out of thin air
};

const MINUTE = 60n * 1000n; // in milliseconds
const DAY = 24n * 60n * MINUTE;
export const zoeFeesConfig = chainTimerServiceP => ({
  getPublicFacetFee: 50n,
  installFee: 65_000n,
  startInstanceFee: 5_000_000n,
  offerFee: 65_000n,
  timeAuthority: chainTimerServiceP,
  lowFee: 500_000n,
  highFee: 5_000_000n,
  shortExp: 5n * MINUTE,
  longExp: 1n * DAY,
});

export const meteringConfig = {
  incrementBy: 25_000_000n,
  initial: 50_000_000n,
  threshold: 25_000_000n,
  price: {
    feeNumerator: 1n,
    computronDenominator: 1n, // default is just one-to-one
  },
};
