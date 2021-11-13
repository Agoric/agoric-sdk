// @ts-check

import { E } from '@agoric/eventual-send';

const start = escrowService => {
  // two ways of doing this - a set price per NFT, and an open
  // marketprice where anything can be offered with specific prices
  // per NFT

  // is there any need to get exclusive access to trade? There's
  // very little that needs to be calculated, if the item(s) for sale
  // are the current amounts wanted

  // Example where there is a set price per NFT, and the buyer just
  // the next NFT

  E(escrowService).transferAssets([
    {
      escrowAccount: sellerEscrowAccount,
      subtract: [NFTAmount],
      add: [pricePerNFT],
    },
    {
      escrowAccount: buyerEscrowAccount,
      subtract: [pricePerNFT],
      add: [NFTAmount],
    },
  ]);
};
