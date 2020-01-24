import harden from '@agoric/harden';
import { insist } from '@agoric/ertp/util/insist';
import { makePrivateName } from '@agoric/ertp/util/PrivateName';

import { hydrateOfferRules } from './hydration';
import { makeObservablePurse } from './observable';

export async function makeWallet(
  E,
  zoe,
  registrar,
  pursesStateChangeHandler = () => {},
  inboxStateChangeHandler = () => {},
) {
  // Map of petnames to assay presences
  const petnameToAssay = makePrivateName();

  // Map of petnames to purse presences
  const petnameToPurse = makePrivateName();

  // Map of registrar keys to assays
  const regKeyToAssayMap = makePrivateName();

  // Map of purses to their assays
  const pursePetNameToAssayInfo = makePrivateName();

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

  async function updatePursesState(pursePetName, purse) {
    const { extent } = await E(purse).getBalance();
    const { assayId, assayPetName } = pursePetNameToAssayInfo.get(pursePetName);
    pursesState.set(
      pursePetName,
      harden({
        pursePetName,
        assayId,
        assayPetName,
        extent,
      }),
    );
    pursesStateChangeHandler(getPursesState());
  }

  async function updateInboxState(date, offerRec) {
    // Only sent the metadata to the client.
    inboxState.set(date, offerRec.meta);
    inboxStateChangeHandler(getInboxState());
  }

  const makeAutoswapOffer = async (
    autoswapInstanceRegKey,
    proposedOfferRules,
    pursePetnames,
  ) => {
    // Grab the autoswap instance handle from the registrar
    const autoswapInstanceHandle = await E(registrar).get(
      autoswapInstanceRegKey,
    );

    // =====================
    // === AWAITING TURN ===
    // =====================

    const { publicAPI } = await E(zoe).getInstance(autoswapInstanceHandle);

    // =====================
    // === AWAITING TURN ===
    // =====================

    const invite = await E(publicAPI).getInvite();

    // =====================
    // === AWAITING TURN ===
    // =====================

    // The proposedOfferRules come originally from the autoswap UI
    // which sends it to the wallet UI, which sends it to our offer
    // inbox. Note that to send it across these boundaries, the assay presence
    // in the units had to be replaced with a string identifier. We
    // are using the key in the registrar for that assay.
    const offerRules = hydrateOfferRules(
      regKeyToAssayMap,
      undefined,
      proposedOfferRules,
    );

    const purses = pursePetnames.map(petnameToPurse.get);
    const payments = offerRules.paymentRules.map((paymentRule, i) =>
      purses[i].withdraw(paymentRule.units),
    );

    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      offerRules,
      payments,
    );

    // =====================
    // === AWAITING TURN ===
    // =====================

    const swapOk = seat.swap();

    payoutP.then(payouts =>
      payouts.map((payout, i) => purses[i].depositAll(payout)),
    );

    return swapOk;
  };

  // === API
  function addAssay(petName, assay, registrarKey) {
    petName = `${petName}`;
    registrarKey = `${registrarKey}`;
    petnameToAssay.init(petName, assay);
    regKeyToAssayMap.init(registrarKey, assay);
  }

  async function makeEmptyPurse(assayPetname, pursePetname) {
    // Validate pursePetname
    pursePetname = `${pursePetname}`;
    insist(
      !petnameToPurse.has(pursePetname),
    )`Purse name already used in wallet.`;

    // Validate assayPetName
    assayPetname = `${assayPetname}`;

    // Create the new purse
    const assay = petnameToAssay.get(assayPetname);
    const purse = await E(assay).makeEmptyPurse(pursePetname);

    // =====================
    // === AWAITING TURN ===
    // =====================

    // IMPORTANT: once wrapped, the original purse should never
    // be used otherwise the UI state will be out of sync.

    const observablePurse = makeObservablePurse(purse, () =>
      updatePursesState(pursePetname, purse),
    );

    petnameToPurse.set(pursePetname, observablePurse);
    updatePursesState(pursePetname, purse);
  }

  function depositPayment(allegedPayment, pursePetname) {
    // TODO: handle payments with unknown assays
    const purse = petnameToPurse.get(pursePetname);
    return E(purse).depositAll(allegedPayment);
  }

  function getPurses() {
    return harden([...petnameToPurse.values()]);
  }

  function getPurse(name) {
    return petnameToPurse.get(name);
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
    const { meta } = dateToOfferRec.get(date);

    const offerOk = await makeAutoswapOffer(
      autoswapInstanceRegKey,
      proposedOfferRules,
      pursePetnames
    );

    // =====================
    // === AWAITING TURN ===
    // =====================

    // TODO: Error handling
    if (!offerOk) return;

    // Update status, drop the offerRules
    const acceptOfferRec = { meta: { ...meta, status: 'accept' } };
    dateToOfferRec.set(date, acceptOfferRec);
    updateInboxState(date, acceptOfferRec);
  }

  const wallet = harden({
    userFacet: {
      addAssay,
      makeEmptyPurse,
      depositPayment,
      getPurses,
      getPurse,
      addOffer,
      declineOffer,
      acceptOffer,
    },
    adminFacet: {},
    readFacet: {},
  });

  return wallet;
}
