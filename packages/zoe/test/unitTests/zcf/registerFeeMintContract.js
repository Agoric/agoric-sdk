// @ts-check

import { AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

/**
 * Tests zcf.registerFeeMint
 *
 * @type {ContractStartFn}
 */
const start = async (zcf, privateArgs) => {
  // make the `zcf` and `instance` available to the tests
  const instance = zcf.getInstance();
  zcf.setTestJig(() => harden({ instance }));

  const RUNZCFMint = await zcf.registerFeeMint(
    'RUN',
    privateArgs.feeMintAccess,
  );
  const { brand: RUNBrand } = RUNZCFMint.getIssuerRecord();
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
  RUNZCFMint.mintGains(
    {
      Winnings: AmountMath.make(RUNBrand, 10n),
    },
    zcfSeat,
  );

  const creatorFacet = harden({
    getMintedAmount: () => zcfSeat.getAmountAllocated('Winnings'),
    getMintedPayout: () => {
      zcfSeat.exit();
      return E(userSeat).getPayout('Winnings');
    },
  });

  return harden({ creatorFacet });
};

harden(start);
export { start };
