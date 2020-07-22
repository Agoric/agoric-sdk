// @ts-check

import makeIssuerKit from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

/**
 * This contract mints non-fungible tokens and creates a selling contract
 * instance to sell the tokens in exchange for some sort of money.
 *
 * makeInstance() returns an invitation that, when exercised, returns a
 * ticketMaker with a `.sellTokens()` method. `.sellTokens()` takes a
 * specification of what is being sold, such as:
 * {
 *   customValueProperties: { ...arbitrary },
 *   count: 3,
 *   moneyIssuer: moolaIssuer,
 *   sellItemsInstallationHandle,
 *   pricePerItem: moolaAmountMath.make(20),
 * }
 * The payouts are returned as an offerResult in the `outcome`, and an API that
 * allows selling the tickets that were produced. You can reuse the ticket maker
 * to mint more tickets (e.g. for a separate show.)
 *
 * @typedef {import('../zoe').ContractFacet} ContractFacet
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  const { terms } = zcf.getInstanceRecord();
  const { tokenName = 'token' } = terms;

  // Create the internal token mint
  const { issuer, mint, amountMath: tokenAmountMath } = makeIssuerKit(
    tokenName,
    'set',
  );

  const zoeService = zcf.getZoeService();

  const sellTokens = ({
    customValueProperties,
    count,
    moneyIssuer,
    sellItemsInstallationHandle,
    pricePerItem,
  }) => {
    const tokenAmount = tokenAmountMath.make(
      harden(
        Array(count)
          // @ts-ignore
          .fill()
          .map((_, i) => {
            const tokenNumber = i + 1;
            return {
              ...customValueProperties,
              number: tokenNumber,
            };
          }),
      ),
    );
    const tokenPayment = mint.mintPayment(harden(tokenAmount));
    // Note that the proposal `want` is empty
    // This is due to a current limitation in proposal
    // expressiveness:
    // https://github.com/Agoric/agoric-sdk/issues/855
    // It's impossible to know in advance how many tokens will be
    // sold, so it's not possible to say `want: moola(3*22)`
    // In a future version of Zoe, it will be possible to express:
    // "I want n times moolas where n is the number of sold tokens"
    const proposal = harden({
      give: { Items: tokenAmount },
    });
    const paymentKeywordRecord = harden({ Items: tokenPayment });

    const issuerKeywordRecord = harden({
      Items: issuer,
      Money: moneyIssuer,
    });

    const sellItemsTerms = harden({
      pricePerItem,
    });
    return E(zoeService)
      .makeInstance(
        sellItemsInstallationHandle,
        issuerKeywordRecord,
        sellItemsTerms,
      )
      .then(({ invite, instanceRecord: { handle: instanceHandle } }) => {
        return E(zoeService)
          .offer(invite, proposal, paymentKeywordRecord)
          .then(offerResult => {
            return harden({
              ...offerResult,
              sellItemsInstanceHandle: instanceHandle,
            });
          });
      });
  };

  const mintTokensHook = _offerHandle => {
    // outcome is an object with a sellTokens method
    return harden({ sellTokens });
  };

  zcf.initPublicAPI(
    harden({
      getTokenIssuer: () => issuer,
    }),
  );

  return zcf.makeInvitation(mintTokensHook, 'mint tokens');
};

harden(makeContract);
export { makeContract };
