// @ts-check

import { AmountMath, AssetKind } from '@agoric/ertp';
import { E, Far } from '@endo/far';
import { fit, M, makeCopyBag, makeStore } from '@agoric/store';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';

const { details: X } = assert;

export const KW = harden({
  /** seat keyword for use in offers to return an attestation. */
  Attestation: 'Attestation',
});

/**
 * Find-or-create value in store.
 *
 * @type {<K, V>(store: Store<K, V>, key: K, thunk: () => V) => V}
 */
const getOrElse = (store, key, make) => {
  if (store.has(key)) {
    return store.get(key);
  }
  const value = make();
  store.init(key, value);
  return value;
};

/**
 * To support `makeAttestation`, we directly mint attestation payments.
 * We still use a ZCFMint because returning attestations is done
 * through Zoe offers.
 *
 * @param {ContractFacet} zcf
 * @param {ZCFMint} zcfMint
 * @param {Amount} amountToMint
 * @returns {Promise<Payment>}
 */
const mintZCFMintPayment = (zcf, zcfMint, amountToMint) => {
  const { userSeat, zcfSeat } = zcf.makeEmptySeatKit();
  zcfMint.mintGains(harden({ [KW.Attestation]: amountToMint }), zcfSeat);
  zcfSeat.exit();
  return E(userSeat).getPayout(KW.Attestation);
};

/**
 * Make an ZCFMint attentuated so that minting represents
 * putting a lien on staked assets. Payments can be returned,
 * releasing (part of) the lien.
 *
 * @param {ContractFacet} zcf
 * @param {string} keyword for use in makeZCFMint
 * @param {Brand<'nat'>} stakeBrand brand of the staked assets
 * @param {ERef<StakingAuthority>} lienBridge bridge to account state
 */
const makeAttestationKit = async (zcf, keyword, stakeBrand, lienBridge) => {
  const { add, subtract, makeEmpty, isGTE, coerce } = AmountMath;
  const empty = makeEmpty(stakeBrand);
  const zcfMint = await zcf.makeZCFMint(keyword, AssetKind.COPY_BAG);
  const { issuer, brand: attBrand } = zcfMint.getIssuerRecord();

  /**
   * @param {string} address
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
    // Caller is responsible to split payload of >1 item.
    fit(attestationAmount.value.payload, harden([[M.string(), M.bigint()]]));
    /** @type {[string, bigint][]} */
    const [[address, valueReturned]] = attestationAmount.value.payload;
    const lienedAmount = AmountMath.make(stakeBrand, valueReturned);
    return { address, lienedAmount };
  };

  /** @type {(hi: Amount, lo: Amount) => Amount} */
  const subtractOr0 = (hi, lo) => (isGTE(hi, lo) ? subtract(hi, lo) : empty);
  // check that x <= hi - lo
  const checkDelta = (x, label, hi, lo) => {
    const bound = subtractOr0(hi, lo);
    assert(
      isGTE(bound, coerce(stakeBrand, x)),
      // TODO: X`...${raw(label)}...`
      X`Only ${bound} was ${label}, but an attestation was attempted for ${x}`,
    );
  };
  const checkAccountState = async (address, toLien) => {
    const s = await E(lienBridge).getAccountState(address, stakeBrand);
    const unlocked = subtractOr0(s.total, s.locked);
    checkDelta(toLien, 'unliened', s.total, s.liened);
    checkDelta(toLien, 'bonded and unliened', s.bonded, s.liened);
    checkDelta(toLien, 'unlocked and unliened', unlocked, s.liened);
  };

  /** @type {Store<Address, Amount<'nat'>>} */
  const amountByAddress = makeStore('amount');

  /**
   * @param { string } address
   * @param { Amount<'nat'> } lienDelta
   */
  const mintAttestation = async (address, lienDelta) => {
    assert.typeof(address, 'string');
    // This account state check is primarily to provide useful diagnostics.
    // Since things like the bonded amount can change out from under us,
    // we shouldn't rely on it completely.
    // TODO: consider performance implications vs. diagnostics.
    await checkAccountState(address, lienDelta);

    const current = getOrElse(amountByAddress, address, () => empty);
    const target = add(current, lienDelta);

    // Since our mint is not subject to normal supply/demand,
    // minting here and failing in setLiened below does no harm.
    const attestationPaymentP = mintZCFMintPayment(
      zcf,
      zcfMint,
      wrapLienedAmount(address, lienDelta),
    );

    // If setLiened returns successfully, then
    // the preconditions were indeed met and we
    // can update the stored liened amount.
    await E(lienBridge).setLiened(address, current, target);
    amountByAddress.set(address, target);
    return attestationPaymentP;
  };

  /** @param {ZCFSeat} seat */
  const returnAttestation = async seat => {
    assertProposalShape(seat, { give: { Attestation: null }, want: {} });

    /** @type {Amount<'copyBag'>} */
    const attestationAmount = seat.getAmountAllocated(KW.Attestation);
    const { address, lienedAmount: amountReturned } =
      unwrapLienedAmount(attestationAmount);

    const liened = amountByAddress.get(address); // or throw
    const updated = subtract(liened, amountReturned); // or throw

    await E(lienBridge).setLiened(address, liened, updated);
    // COMMIT. Burn the escrowed attestation payment and exit the seat
    amountByAddress.set(address, updated);
    zcfMint.burnLosses(harden({ Attestation: attestationAmount }), seat);
    seat.exit();
  };

  /**
   * Get liened amount synchronously.
   *
   * @param {string} address
   * @param {Brand<'nat'>} brand
   */
  const getLiened = (address, brand) => {
    assert.typeof(address, 'string');
    assert.equal(
      brand,
      stakeBrand,
      X`This contract can only make attestations for ${brand}`,
    );
    return getOrElse(amountByAddress, address, () => empty);
  };

  const lienMint = harden({
    mintAttestation,
    returnAttestation,
    getLiened,
    /** @param { Amount<'copyBag'> } attAmt */
    unwrapLienedAmount: attAmt => unwrapLienedAmount(attAmt).lienedAmount,
  });
  return harden({ issuer, brand: attBrand, lienMint });
};

/**
 * Authorize each account holder to lien some of their staked assets
 * and get an attestation that the lien is in place.
 *
 * @param {ContractFacet} zcf
 * @param {Brand} stakeBrand
 * @param {string} keyword for attestation issuer
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
 * Note the Attestation keyword for use in returnAttestation offers.
 */
export const makeAttestationFacets = async (
  zcf,
  stakeBrand,
  keyword,
  lienBridge,
) => {
  /** @type {Store<Address, AttMaker>} */
  const attMakerByAddress = makeStore('address');

  const { issuer, brand, lienMint } = await makeAttestationKit(
    zcf,
    keyword,
    stakeBrand,
    lienBridge,
  );

  /** @param { string } address */
  const makeAttMaker = address =>
    Far('attMaker', {
      /** @param { Amount<'nat'> } lienedDelta */
      makeAttestation: lienedDelta =>
        lienMint.mintAttestation(address, lienedDelta),
      getLiened: () => lienMint.getLiened(address, stakeBrand),
      getAccountState: () => E(lienBridge).getAccountState(address, stakeBrand),
      makeReturnAttInvitation: () =>
        zcf.makeInvitation(lienMint.returnAttestation, 'returnAttestation'),
      unwrapLienedAmount: lienMint.unwrapLienedAmount,
    });

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
       * @param { string } address
       */
      provideAttestationMaker: address => {
        assert.typeof(address, 'string');
        return getOrElse(attMakerByAddress, address, () =>
          makeAttMaker(address),
        );
      },
      getLiened: lienMint.getLiened,
    }),
  });
};
