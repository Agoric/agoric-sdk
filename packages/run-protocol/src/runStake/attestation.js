// @ts-check
// @jessie-check

import { AmountMath, AssetKind } from '@agoric/ertp';
import { E, Far } from '@endo/far';
import { fit, M, makeCopyBag, makeStore, provide } from '@agoric/store';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';
import { AttKW as KW } from './constants.js';
import { makeAttestationTool } from './attestationTool.js';

const { details: X } = assert;

/**
 * @typedef {{
 *   mintAttestation: unknown,
 *   returnAttestation: OfferHandler,
 *   getLiened: (address: Address, brand: Brand<'nat'>) => Amount<'nat'>,
 *   getAccountState: unknown,
 *   wrapLienedAmount: unknown,
 *   unwrapLienedAmount: unknown,
 * }} LienMint
 */

/**
 * To support `makeAttestation`, we directly mint attestation payments.
 * We still use a ZCFMint because returning attestations is done
 * through Zoe offers.
 *
 * @param {ZCF} zcf
 * @template {AssetKind} K
 * @param {ZCFMint<K>} zcfMint
 * @param {Amount<K>} amountToMint
 * @returns {Promise<Payment<K>>}
 */
const mintZCFMintPayment = (zcf, zcfMint, amountToMint) => {
  const { userSeat, zcfSeat } = zcf.makeEmptySeatKit();
  zcfMint.mintGains(harden({ [KW.Attestation]: amountToMint }), zcfSeat);
  zcfSeat.exit();
  return E(userSeat).getPayout(KW.Attestation);
};

/**
 * Make a ZCFMint attentuated so that minting represents
 * putting a lien on staked assets. Payments can be returned,
 * releasing (part of) the lien.
 *
 * NOTE: Using Issuer.combine or AmountMath.add could result in
 * Payments / Amounts with multiple addresses.
 * Callers are responsible to split any such payment before returning.
 *
 * @param {ZCF} zcf
 * @param {Brand<'nat'>} stakeBrand brand of the staked assets
 * @param {ERef<StakingAuthority>} lienBridge bridge to account state
 */
const makeAttestationIssuerKit = async (zcf, stakeBrand, lienBridge) => {
  const { add, subtract, makeEmpty, isGTE, coerce } = AmountMath;
  const empty = makeEmpty(stakeBrand);
  /** @type { ZCFMint<'copyBag'> } */
  const attMint = await zcf.makeZCFMint(KW.Attestation, AssetKind.COPY_BAG);
  /** @type {{ issuer: Issuer<'copyBag'>, brand: Brand<'copyBag'>}} */
  const { issuer, brand: attBrand } = attMint.getIssuerRecord();

  /**
   * @param {Address} address
   * @param {Amount<'nat'>} lienedAmount
   * @returns {Amount<'copyBag'>}
   */
  const wrapLienedAmount = (address, lienedAmount) =>
    AmountMath.make(attBrand, makeCopyBag([[address, lienedAmount.value]]));

  /** @param {Amount<'copyBag'>} attestationAmount */
  const unwrapLienedAmount = attestationAmount => {
    assert(
      attestationAmount.brand === attBrand,
      X`The escrowed attestation ${attestationAmount} was not of the attestation brand ${attBrand}`,
    );
    fit(attestationAmount.value.payload, harden([[M.string(), M.bigint()]]));
    /** @type {[Address, bigint][]} */
    const [[address, valueReturned]] = attestationAmount.value.payload;
    const lienedAmount = AmountMath.make(stakeBrand, valueReturned);
    return { address, lienedAmount };
  };

  /**
   * Non-authoritative store of nonzero lien amounts.
   * @type {Store<Address, Amount<'nat'>>}
   */
  const amountByAddress = makeStore('amount');

  /**
   * Get non-authoritative liened amount from the JS store, without using the lienBridge.
   *
   * @param {Address} address
   * @param {Brand<'nat'>} brand
   */
  const getLiened = (address, brand) => {
    assert.typeof(address, 'string');
    assert.equal(brand, stakeBrand);
    if (amountByAddress.has(address)) {
      return amountByAddress.get(address);
    }
    // Don't bother storing empty amounts.
    return empty;
  };

  const getAccountState = async (address, brand) => {
    const liened = getLiened(address, brand);
    const s = await E(lienBridge).getAccountState(address, brand);
    assert(AmountMath.isEqual(liened, s.liened));
    return s;
  };

  /** @type {(m: Amount, s: Amount) => Amount} */
  const subtractOrZero = (m, s) => (isGTE(m, s) ? subtract(m, s) : empty);
  // check that x <= hi - lo
  const checkDelta = (x, label, hi, lo) => {
    const bound = subtractOrZero(hi, lo);
    assert(
      isGTE(bound, coerce(stakeBrand, x)),
      // TODO: X`...${raw(label)}...`
      X`Only ${bound} was ${label}, but an attestation was attempted for ${x}`,
    );
  };
  const assertAccountStateOK = async (address, toLien) => {
    const s = await getAccountState(address, stakeBrand);
    const unlocked = subtractOrZero(s.total, s.locked);
    checkDelta(toLien, 'unliened', s.total, s.liened);
    checkDelta(toLien, 'bonded and unliened', s.bonded, s.liened);
    checkDelta(toLien, 'unlocked and unliened', unlocked, s.liened);
  };

  /**
   * @param {Address} address
   * @param {Amount<'nat'>} lienDelta
   */
  const mintAttestation = async (address, lienDelta) => {
    // This account state check is primarily to provide useful diagnostics.
    // Since things like the bonded amount can change out from under us,
    // we shouldn't rely on it completely.
    // PERFORMANCE NOTE: this check shouldn't be necessary and skipping it
    // may speed things up.
    await assertAccountStateOK(address, lienDelta);

    // Since our mint is not subject to normal supply/demand,
    // minting here and failing in changeLiened below does no harm.
    const attestationPayment = await mintZCFMintPayment(
      zcf,
      attMint,
      wrapLienedAmount(address, lienDelta),
    );

    const newLiened = await E(lienBridge).increaseLiened(address, lienDelta);
    // COMMIT: update the stored liened amount and issue the attestation.
    if (amountByAddress.has(address)) {
      amountByAddress.set(address, newLiened);
    } else {
      amountByAddress.init(address, newLiened);
    }
    return attestationPayment;
  };

  /** @param {ZCFSeat} seat */
  const returnAttestation = async seat => {
    assertProposalShape(seat, { give: { [KW.Attestation]: null }, want: {} });

    const {
      give: { [KW.Attestation]: attestationAmount },
    } = seat.getProposal();
    if (AmountMath.isEmpty(attestationAmount)) {
      seat.exit();
      return;
    }
    const { address, lienedAmount: amountReturned } =
      unwrapLienedAmount(attestationAmount);

    const newLiened = await E(lienBridge).decreaseLiened(address, amountReturned);
    // COMMIT. Burn the escrowed attestation payment and exit the seat.
    if (newLiened === empty) {
      amountByAddress.delete(address)
    } else {
      amountByAddress.set(address, newLiened);
    }
    attMint.burnLosses(harden({ Attestation: attestationAmount }), seat);
    seat.exit();
  };

  /** @type {ERef<LienMint>} */
  const lienMint = Far('LienMint', {
    mintAttestation,
    returnAttestation,
    getLiened,
    getAccountState,
    wrapLienedAmount,
    /**
     * @param {Amount<'copyBag'>} attAmt
     * @throws if `attAmt` payload length is not 1
     */
    unwrapLienedAmount: attAmt => unwrapLienedAmount(attAmt).lienedAmount,
  });
  return harden({ issuer, brand: attBrand, lienMint });
};

/**
 * Authorize each account holder to lien some of their staked assets
 * and get an attestation that the lien is in place.
 *
 * @param {ZCF} zcf
 * @param {Brand<'nat'>} stakeBrand
 * @param {ERef<StakingAuthority>} lienBridge
 *
 * NOTE: the liened amount is kept both here in JS and on the
 * other side of the lienBridge. The mint created here
 * is the authority on the liened amount. The liened amount
 * on the other side of the bridge may lag. Do not create two
 * mints that share a bridge.
 *
 * The provideAttestationMaker method on the returned creatorFacet
 * provides the authorization for an address. The account holder
 * can then use attMaker.makeAttestation(lienDelta).
 *
 * The keyword for use in returnAttestation offers is `Attestation`.
 */
export const makeAttestationFacets = async (zcf, stakeBrand, lienBridge) => {
  /** @type {Store<Address, AttestationTool>} */
  const attMakerByAddress = makeStore('address');

  const { issuer, brand, lienMint } = await makeAttestationIssuerKit(
    zcf,
    stakeBrand,
    lienBridge,
  );

  return harden({
    publicFacet: Far('attestation publicFacet', {
      getIssuer: () => issuer,
      getBrand: () => brand,
      makeReturnAttInvitation: () =>
        zcf.makeInvitation(lienMint.returnAttestation, 'returnAttestation'),
    }),
    creatorFacet: Far('creator', {
      /**
       * IMPORTANT: The attestation maker should only be given to the owner of the
       * address. Only the owner can authorize creation of attestations and
       * the resulting liens on their underlying tokens.
       *
       * @param {Address} address
       */
      provideAttestationTool: address => {
        assert.typeof(address, 'string');
        return provide(attMakerByAddress, address, () =>
          makeAttestationTool(address, lienMint, stakeBrand, zcf),
        );
      },
      getLiened: lienMint.getLiened,
    }),
  });
};
