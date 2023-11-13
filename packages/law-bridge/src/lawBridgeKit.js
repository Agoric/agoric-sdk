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
 * @param {{
 *   stableBrand: Brand;
 *   storageNode: StorageNode;
 *   marshaller: Marshaller;
 * }} opts
 */
export const prepareLawBridgeKit = async (
  baggage,
  zcf,
  { stableBrand, storageNode, marshaller },
) => {
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
        /**
         * Generates a binding invitation.
         *
         * @param {object} opts
         * @param {string} opts.key - The requested key for the new binding
         */
        makeBindingInvitation({ key }) {
          assert.string(key);
          const hook =
            /** @param {ZCFSeat} seat */
            async seat => {
              const {
                give: { Fee: given },
              } = seat.getProposal();
              console.info('makeBindingInvitation', key, given);
              console.error('NOT YET IMPLEMENTED: reserve key in vstorage');
              // what happens if key is already in vstorage ?
              /**
               * @type {StorageNode}
               */
              const bindingNode = await E(storageNode).makeChildNode(key);
              await E(bindingNode).setValue('RESERVED');
              seat.exit();
            };

          return zcf.makeInvitation(
            hook,
            'binding',
            undefined,
            M.splitRecord({
              // TODO charge a buck
              //   give: { Fee: stableAmountShape },
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
