import { E, Far } from '@endo/far';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { atomicTransfer } from '@agoric/zoe/src/contractSupport/index.js';

const COSMOS_DECIMALS = 6;

/**
 * Given sufficient IST, create an issuer for an IBC denom
 *
 * @param {ZCF<InterchainPoolTerms>} zcf
 * @param {{
 *   bankManager: ERef<BankManager>,
 * }} privateArgs
 *
 * @typedef {{
 * }} InterchainPoolTerms
 *
 * @typedef {{
 *   denom: string,
 *   decimalPlaces: number,
 * }} AssetDetail
 */
export const start = (zcf, { bankManager }) => {
  let kwNonce = 0;

  /**
   * @param {ZCFSeat} seat
   * @param {AssetDetail} detail
   */
  const step1Handler = async (seat, detail) => {
    assert.typeof(
      detail,
      'object',
      'offer arg must be { denom, decimalPlaces? }',
    );
    const { denom, decimalPlaces = COSMOS_DECIMALS } = detail;
    assert.typeof(denom, 'string');
    assert.typeof(decimalPlaces, 'number');

    const {
      give: { Central: centralAmt },
    } = seat.getProposal();

    const interAsset = makeIssuerKit(
      denom,
      AssetKind.NAT,
      harden({ decimalPlaces }),
    );
    kwNonce += 1;

    await zcf.saveIssuer(interAsset.issuer, `Interchain${kwNonce}`);

    /** @type { OfferHandler } */
    const step2Handler = async seat2 => {
      const {
        give: { Secondary: secondaryAmt },
      } = seat2.getProposal();
      AmountMath.coerce(interAsset.brand, secondaryAmt);

      atomicTransfer(zcf, seat, seat2, { Central: centralAmt });
    };

    const keyword = denom; // ISSUE #5412: should not show up in all wallets.
    const proposedName = denom;
    const [invitation] = await Promise.all([
      zcf.makeInvitation(step2Handler, 'interchain pool step 2'),
      E(bankManager).addAsset(
        denom,
        keyword,
        proposedName,
        interAsset, // with mint
      ),
    ]);

    return harden({
      issuer: interAsset.issuer,
      invitation,
    });
  };

  const publicFacet = Far('InterchainPoolGateway', {
    makeInterchainPoolInvitation: () =>
      zcf.makeInvitation(step1Handler, 'interchain pool step 1'),
  });
  return { publicFacet };
};
