import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';

export const setupMintKits = () => {
  const runKit = makeIssuerKit(
    'RUN',
    AssetKind.NAT,
    harden({ decimalPlaces: 6 }),
  );
  const bldKit = makeIssuerKit(
    'BLD',
    AssetKind.NAT,
    harden({ decimalPlaces: 6 }),
  );
  const run = value => AmountMath.make(runKit.brand, value);
  const bld = value => AmountMath.make(bldKit.brand, value);
  return { runKit, bldKit, run, bld };
};
