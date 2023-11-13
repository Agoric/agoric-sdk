import { makeExo } from '@agoric/store';
import { M, prepareExoClassKit } from '@agoric/vat-data';
import { provideAll } from '@agoric/zoe/src/contractSupport/durability.js';
import { E } from '@endo/eventual-send';

const LawBridgeKitI = {
  creator: M.interface('LawBridgeKit creator facet', {}),
  public: M.interface('LawBridgeKit public facet', {
    makeBindingInvitation: M.call().returns(M.promise()),
    makeFundingInvitation: M.call().returns(M.promise()),
  }),
};

/**
 * Generate the function comment for the given function.
 *
 * @param {import('@agoric/swingset-liveslots').Baggage} baggage
 * @param {ZCF} zcf - the zcf parameter
 */
export const prepareLawBridgeKit = async (baggage, zcf, { stableBrand }) => {
  const { stableAmountShape } = await provideAll(baggage, {
    stableAmountShape: () => E(stableBrand).getAmountShape(),
  });

  const initState = () => {
    return {};
  };

  const makeLawBridgeKit = prepareExoClassKit(
    baggage,
    'LawBridgeKit',
    LawBridgeKitI,
    initState,
    {
      creator: {},
      public: {
        makeBindingInvitation: () => {
          const hook =
            /** @param {ZCFSeat} seat */
            seat => {
              const {
                give: { In: given },
              } = seat.getProposal();
              console.info('makeBindingInvitation', given);
              seat.exit();
            };

          return zcf.makeInvitation(
            hook,
            'wantBinding',
            undefined,
            M.splitRecord({
              give: { In: stableAmountShape },
            }),
          );
        },
        makeFundingInvitation: () => {},
      },
    },
  );

  return makeLawBridgeKit;
};
harden(prepareLawBridgeKit);
