// @ts-check
import { registerPlugin } from '@agoric/babel-standalone';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { CLOSING_CONDITIONS } from '../escrow/cleanConditions';

const { details: X } = assert;

const start = async (escrowService, useObjService, terms, privateArgs) => {
  const { sellerEA } = privateArgs;
  const [sellerSnapshot] = await E(escrowService).startTransfer([sellerEA]);
  const closing = sellerSnapshot.conditions.closing;
  assert(closing.condition === CLOSING_CONDITIONS.AFTER_DEADLINE);
  const underlyingAssets = sellerSnapshot.escrowedAmounts;
  const strikePrice = sellerSnapshot.wantedAmounts;

  // An invitation gives an object which can trigger the trade of
  // the underlyingAssets for the strikePrice, but only if the option
  // has not expired

  // if the trade has completed successfully, no NFT can be created.
  let available = true;

  const exerciseOptionObj = Far('exerciseOption', {
    exerciseOption: async buyerEA => {
      // old code had a synchronous check that the seller seat hadn't
      // exited. It was only helpful for giving a good error message.

      const [buyerSnapshot] = await E(escrowService).startTransfer([buyerEA]);

      await E(escrowService).completeTransfer([
        {
          seat: sellerSnapshot.seat,
          add: strikePrice,
          subtract: underlyingAssets,
        },
        {
          seat: buyerSnapshot.seat,
          add: underlyingAssets,
          subtract: strikePrice,
        },
      ]);
      available = false;

      // zcf.shutdown('Swap completed.');
    },

    // not the same thing as getState - these are intended to be public
    getInfo: () => {
      assert(
        available,
        X`The option is not longer available to be transferred. It has expired, or it was exercised.`,
      );
      return harden({
        expirationDate: closing.deadline,
        timeAuthority: closing.timer,
        underlyingAssets,
        strikePrice,
      });
    },
  });

  return E(useObjService).registerGetNFT(exerciseOptionObj);
};

harden(start);
export { start };
