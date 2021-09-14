// @ts-check

import { Far } from '@agoric/marshal';
import { AmountMath, AssetKind } from '@agoric/ertp';

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/exported.js';

const { details: X } = assert;

/** @type {ContractStartFn} */
const start = async zcf => {
  const {
    totalLimit,
    hashOfMetadata,
    pricePerNFT,
    startTime,
    timeAuthority,
    limitPerCall,
    tokenName,
  } = zcf.getTerms();

  assert.typeof(
    tokenName,
    'string',
    X`A name for the NFT token kind must be provided`,
  );
  assert.typeof(totalLimit, 'number', X`A number must be provided for the limit of the total number of NFTs to be minted`);

  let countTotal = 0;
  let hasStarted = false;

  // TODO: set timeAuthority wakeup to start

  const mint = await zcf.makeZCFMint(tokenName, AssetKind.SET);
  const { brand } = mint.getIssuerRecord();

  const mintNewToken = seat => {
    mint.mintGains({ Tokens: })
  };

  const assertHasStarted = () => {
    assert(hasStarted, X`The sale has not started, but will start at ${startTime} as determined by the timeAuthority ${timeAuthority}`);
  };
  
  const assertEnoughLeft = (countToBuy) => {
    assert(countTotal + countToBuy < totalLimit);
  }

  const createIds = countToBuy => {
    const value = [];
    // TODO: implement
    return value;
  };

  const assertEnoughPaid = () => {
    // TODO
  };

  const buyNFTs = (buyerSeat, offerArgs) => {
    assertHasStarted();
    const countToBuy = (offerArgs && offerArgs.countToBuy) || 1;
    assert.typeof(countToBuy, 'number');
    assertEnoughLeft(countToBuy);
    assertEnoughPaid();

    const amount = AmountMath.make(brand, createIds(countToBuy));
    mint.mintGains({ NFTs: amount }, buyerSeat);

    // TODO: transfer money

    buyerSeat.exit();
  };

  const publicFacet = Far('NFT Drop', {
    makeInvitation: () => zcf.makeInvitation(buyNFTs, 'buyNFTs'),
  });

  return harden({ publicFacet });
};
harden(start);
export { start };
