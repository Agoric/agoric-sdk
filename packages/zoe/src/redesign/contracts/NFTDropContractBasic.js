// @ts-check

// `Far` makes objects callable outside the contract code, and even
// callable off-chain!
import { Far } from '@agoric/marshal';

// ERTP is the library for dealing with NFTs and fungible tokens
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { CLOSING_CONDITIONS } from '../escrow/cleanConditions';

const start = async (escrowService, invitationMaker, terms, privateArgs) => {
  const { pricePerNFT, nftName } = terms;
  const { payoutHandler } = privateArgs;

  const issuerKit = makeIssuerKit(nftName, AssetKind.SET);
  const { brand: NFTBrand } = issuerKit;

  let currentId = 1n;

  const buyNFTs = async buyerAccount => {
    const [buyerSnapshot] = await E(escrowService).startTransfer([
      buyerAccount,
    ]);
    const {
      currentAmounts: buyerContributed,
      seat: buyerSeat,
      conditions: { wantedAmounts: buyerWanted },
    } = buyerSnapshot;

    // TODO: perform checks

    const amount = AmountMath.make(NFTBrand, [currentId]);
    const nft = issuerKit.mint.mintPayment(amount);
    currentId += 1n;

    const conditions = harden({
      wantedAmounts: buyerContributed,
    });
    const sellerAccount = E(escrowService).openEscrowAccount(
      nft,
      conditions,
      payoutHandler,
    );
    await E(escrowService).completeTransfer([
      {
        seat: buyerSeat,
        add: buyerWanted,
        subtract: buyerContributed,
      },
      {
        account: sellerAccount,
        add: buyerContributed,
        subtract: buyerWanted,
      },
    ]);
  };

  const publicFacet = Far('NFT Drop', {
    makeInvitation: () => E(invitationMaker).registerAndGetNFT({ buyNFTs }),
  });

  return harden({ publicFacet });
};

harden(start);
export { start };
