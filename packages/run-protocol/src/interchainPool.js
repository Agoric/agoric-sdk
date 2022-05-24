// @ts-check
import { E, Far } from '@endo/far';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { offerTo } from '@agoric/zoe/src/contractSupport/index.js';

const { details: X, quote: q } = assert;

const COSMOS_DECIMALS = 6;

/**
 * Given sufficient IST, create an issuer for an IBC denom
 * and an invitation to add a pool for it to the AMM.
 *
 * @param {ZCF<InterchainPoolTerms>} zcf
 * @param {{
 *   bankManager: ERef<BankManager>,
 * }} privateArgs
 *
 * TODO: get minimumCentral dynamically from the AMM
 * @typedef {{
 *   minimumCentral: Amount<'nat'>,
 *   amm: Instance,
 * }} InterchainPoolTerms
 *
 * @typedef {{
 *   denom: string,
 *   decimalPlaces: number,
 * }} AssetDetail
 */
export const start = (zcf, { bankManager }) => {
  const {
    brands: { Central: centralBrand },
    minimumCentral,
    amm,
  } = zcf.getTerms();
  AmountMath.coerce(centralBrand, minimumCentral);

  const zoe = zcf.getZoeService();
  /** @type {ERef<XYKAMMPublicFacet>} */
  const ammPub = E(zoe).getPublicFacet(amm);

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
    assert(
      AmountMath.isGTE(centralAmt, minimumCentral),
      X`at least ${q(minimumCentral)} required; only ${q(centralAmt)} given`,
    );

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

      const liquidityIssuer = await E(ammPub).addIssuer(
        interAsset.issuer,
        `Interchain${kwNonce}`,
      );
      await zcf.saveIssuer(liquidityIssuer, `Liquidity${kwNonce}`);

      const proposal = harden({
        give: {
          Central: centralAmt,
          Secondary: secondaryAmt,
        },
      });

      seat2.incrementBy(seat.decrementBy(harden({ Central: centralAmt })));
      zcf.reallocate(seat, seat2);

      const invitation = await E(ammPub).addPoolInvitation();
      const { userSeatPromise, deposited } = await offerTo(
        zcf,
        invitation,
        undefined,
        proposal,
        seat2,
      );
      return deposited.then(_ => {
        seat.exit();
        seat2.exit();

        return E(userSeatPromise).getOfferResult();
      });
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
