import { AmountMath } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

/**
 * Tests zcf.registerFeeMint
 *
 * @type {ContractStartFn<undefined, {getMintedAmount: unknown, getMintedPayout: unknown}>}
 */
const start = async (zcf, privateArgs) => {
  // make the `zcf` and `instance` available to the tests
  const instance = zcf.getInstance();
  zcf.setTestJig(() => harden({ instance }));

  const ISTZCFMint = await zcf.registerFeeMint(
    'IST',
    privateArgs.feeMintAccess,
  );
  const { brand: ISTBrand } = ISTZCFMint.getIssuerRecord();
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
  ISTZCFMint.mintGains(
    harden({
      Winnings: AmountMath.make(ISTBrand, 10n),
    }),
    zcfSeat,
  );

  const creatorFacet = Far('mint creator facet', {
    getMintedAmount: () => zcfSeat.getAmountAllocated('Winnings'),
    getMintedPayout: () => {
      zcfSeat.exit();
      return E(userSeat).getPayout('Winnings');
    },
  });

  // @ts-expect-error creatorFacet not Far(), should it be?
  return harden({ creatorFacet });
};

harden(start);
export { start };
