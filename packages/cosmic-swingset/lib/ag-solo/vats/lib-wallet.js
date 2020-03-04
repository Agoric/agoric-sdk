import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import makeStore from '@agoric/store';
import makeWeakStore from '@agoric/weak-store';
import makeAmountMath from '@agoric/ertp/src/amountMath';

import makeObservablePurse from './observable';

// does nothing
const noActionStateChangeHandler = _newState => {};

export async function makeWallet(
  E,
  zoe,
  registrar,
  pursesStateChangeHandler = noActionStateChangeHandler,
  inboxStateChangeHandler = noActionStateChangeHandler,
) {
  const petnameToPurse = makeStore();
  const issuerPetnameToIssuer = new Map();
  const issuerToIssuerPetname = makeWeakStore();
  const brandToIssuer = makeStore();
  const brandToMath = makeStore();

  // Offers that the wallet knows about (the inbox).
  const dateToOfferRec = new Map();

  // Client-side representation of the purses inbox;
  const pursesState = new Map();
  const inboxState = new Map();

  function getPursesState() {
    return JSON.stringify([...pursesState.values()]);
  }

  function getInboxState() {
    return JSON.stringify([...inboxState.values()]);
  }

  async function updatePursesState(pursePetname, purse) {
    const [{ extent }, brand] = await Promise.all([
      E(purse).getCurrentAmount(),
      E(purse).getAllegedBrand(),
    ]);
    const issuerPetname = issuerToIssuerPetname.get(brandToIssuer.get(brand));
    pursesState.set(pursePetname, {
      purseName: pursePetname,
      issuerPetname,
      extent,
    });
    pursesStateChangeHandler(getPursesState());
  }

  async function updateInboxState(date, offerRec) {
    // Only sent the metadata to the client.
    inboxState.set(date, offerRec.meta);
    inboxStateChangeHandler(getInboxState());
  }

  function checkOrder(a0, a1, b0, b1) {
    if (a0 === b0 && a1 === b1) {
      return true;
    }

    if (a0 === b1 && a1 === b0) {
      return false;
    }

    throw new TypeError('Cannot resolve assay ordering');
  }

  async function makeOffer(date) {
    const {
      meta: { purseName0, purseName1, instanceId },
      offerRules,
    } = dateToOfferRec.get(date);

    const purse0 = petnameToPurse.get(purseName0);
    const purse1 = petnameToPurse.get(purseName1);

    const {
      payoutRules: [
        {
          amount: { extent: extent0, issuerId: issuerId0 },
        },
        {
          amount: { extent: extent1, issuerId: issuerId1 },
        },
        {
          amount: { extent: extent2 },
        },
      ],
    } = offerRules;

    const instanceHandleP = E(registrar).get(instanceId);
    const regIssuer0P = E(registrar).get(issuerId0);
    const regIssuer1P = E(registrar).get(issuerId1);

    const [instanceHandle, regIssuer0, regIssuer1] = await Promise.all([
      instanceHandleP,
      regIssuer0P,
      regIssuer1P,
    ]);

    // =====================
    // === AWAITING TURN ===
    // =====================

    const {
      terms: {
        assays: [contractIssuer0, contractIssuer1, liquidityContractIssuer],
      },
      publicAPI,
    } = await E(zoe).getInstance(instanceHandle);

    // =====================
    // === AWAITING TURN ===
    // =====================

    const invite = await E(publicAPI).makeInvite();

    // =====================
    // === AWAITING TURN ===
    // =====================

    assert(contractIssuer0 === regIssuer0 && regIssuer1 === contractIssuer1);

    const brand0 = regIssuer0.getBrand();
    const brand1 = regIssuer1.getBrand();
    // Check whether we sell on contract issuer 0 or 1.
    const normal = checkOrder(
      brand0,
      brand1,
      contractIssuer0.getBrand(),
      contractIssuer1.getBrand(),
    );

    const math0 = brandToMath.get(brand0);
    const math1 = brandToMath.get(brand1);
    const payment0P = E(purse0).withdraw(
      normal ? math0.make(extent0 || 0) : math1.make(extent1 || 0),
    );

    const [payment0] = await Promise.all([payment0P]);

    const contract0Amount = math0.make(extent0 || 0);
    const contract1Amount = math1.make(extent1 || 0);
    const liquidityMath = brandToMath.get(liquidityContractIssuer.getBrand());
    const liquidityContractAmount = liquidityMath.make(extent2 || 0);

    // =====================
    // === AWAITING TURN ===
    // =====================

    // Clone the offer rules to have a writable object.
    const newOfferRules = JSON.parse(JSON.stringify(offerRules));

    // Hydrate with the resolved units.
    newOfferRules.payoutRules[0].units = contract0Amount;
    newOfferRules.payoutRules[1].units = contract1Amount;
    newOfferRules.payoutRules[2].units = liquidityContractAmount;
    harden(newOfferRules);

    const payment = normal
      ? [payment0, undefined, undefined]
      : [undefined, payment0, undefined];

    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      newOfferRules,
      payment,
    );

    // =====================
    // === AWAITING TURN ===
    // =====================

    // IMPORTANT: payout will resolve only once makeOffer()
    // resolves, so we technically only need to await on
    // payout. For readability of the code, and to ease any
    // eventual debugging, we await on both: it is not
    // obvious that both are joined internally, and stumbling
    // over a naked non-awaited invocation of E() would appear
    // as an error.

    const [offerOk, payout] = await Promise.all([E(seat).swap(), payoutP]);

    // =====================
    // === AWAITING TURN ===
    // =====================

    const deposit0P = E(purse0).deposit(payout[normal ? 0 : 1]);
    const deposit1P = E(purse1).deposit(payout[normal ? 1 : 0]);

    await Promise.all([deposit0P, deposit1P]);

    // =====================
    // === AWAITING TURN ===
    // =====================

    return offerOk;
  }

  // === API

  async function addIssuer(issuerPetname, issuer) {
    issuerPetnameToIssuer.set(issuerPetname, issuer);
    issuerToIssuerPetname.init(issuer, issuerPetname);
    const brand = await E(issuer).getBrand();
    brandToIssuer.init(brand, issuer);

    const mathName = await E(issuer).getMathHelpersName();
    const math = makeAmountMath(brand, mathName);
    brandToMath.init(brand, math);
  }

  async function makeEmptyPurse(issuerPetname, pursePetname, memo = 'purse') {
    assert(
      !petnameToPurse.has(pursePetname),
      details`Purse name already used in wallet.`,
    );
    const issuer = issuerPetnameToIssuer.get(issuerPetname);

    // IMPORTANT: once wrapped, the original purse should never
    // be used otherwise the UI state will be out of sync.
    const doNotUse = await E(issuer).makeEmptyPurse(memo);

    const purse = makeObservablePurse(E, doNotUse, () =>
      updatePursesState(pursePetname, doNotUse),
    );

    petnameToPurse.init(pursePetname, purse);
    updatePursesState(pursePetname, purse);
  }

  function deposit(pursePetName, payment) {
    const purse = petnameToPurse.get(pursePetName);
    purse.deposit(payment);
  }

  function getPurses() {
    return harden([...petnameToPurse.values()]);
  }

  async function addOffer(offerRec) {
    const {
      meta: { date },
    } = offerRec;
    dateToOfferRec.set(date, offerRec);
    updateInboxState(date, offerRec);
  }

  function declineOffer(date) {
    const { meta } = dateToOfferRec.get(date);
    // Update status, drop the offerRules
    const declinedOfferRec = { meta: { ...meta, status: 'decline' } };
    dateToOfferRec.set(date, declinedOfferRec);
    updateInboxState(date, declinedOfferRec);
  }

  async function acceptOffer(date) {
    const offerOk = await makeOffer(date);

    // =====================
    // === AWAITING TURN ===
    // =====================

    if (!offerOk) return;

    const { meta } = dateToOfferRec.get(date);
    // Update status, drop the offerRules
    const acceptOfferRec = { meta: { ...meta, status: 'accept' } };
    dateToOfferRec.set(date, acceptOfferRec);
    updateInboxState(date, acceptOfferRec);
  }

  function getIssuers() {
    return Array.from(issuerPetnameToIssuer);
  }

  const wallet = harden({
    addIssuer,
    makeEmptyPurse,
    deposit,
    getIssuers,
    getPurses,
    getPurse: petnameToPurse.get,
    addOffer,
    declineOffer,
    acceptOffer,
  });

  return wallet;
}
