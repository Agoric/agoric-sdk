import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import makeStore from '@agoric/store';
import makeWeakStore from '@agoric/weak-store';
import { makeUnitOps } from '@agoric/ertp/src/unitOps';

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
  const assayPetnameToAssay = makeStore();
  const assayToAssayPetname = makeWeakStore();

  const petnameToUnitOps = makeStore();
  const regKeyToAssayPetname = makeStore();
  const assayPetnameToRegKey = makeStore();

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
    const [{ extent }, assay] = await Promise.all([
      E(purse).getBalance(),
      E(purse).getAssay(),
    ]);
    const assayPetname = assayToAssayPetname.get(assay);
    const assayRegKey = assayPetnameToRegKey.get(assayPetname);
    pursesState.set(pursePetname, {
      purseName: pursePetname,
      assayId: assayRegKey,
      allegedName: assayPetname,
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
          units: { extent: extent0, assayId: assayId0 },
        },
        {
          units: { extent: extent1, assayId: assayId1 },
        },
      ],
    } = offerRules;

    const instanceHandleP = E(registrar).get(instanceId);
    const regAssay0P = E(registrar).get(assayId0);
    const regAssay1P = E(registrar).get(assayId1);
    const purseAssay0P = E(purse0).getAssay();
    const purseAssay1P = E(purse1).getAssay();
    const purseUnit0P = E(purseAssay0P).makeUnits(extent0 || 0);
    const purseUnit1P = E(purseAssay0P).makeUnits(extent1 || 0);

    const [
      instanceHandle,
      regAssay0,
      regAssay1,
      purseAssay0,
      purseAssay1,
      purseUnit0,
      purseUnit1,
    ] = await Promise.all([
      instanceHandleP,
      regAssay0P,
      regAssay1P,
      purseAssay0P,
      purseAssay1P,
      purseUnit0P,
      purseUnit1P,
    ]);

    // =====================
    // === AWAITING TURN ===
    // =====================

    const {
      terms: {
        assays: [contractAssay0, contractAssay1],
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

    assert(contractAssay0 === regAssay0 && regAssay1 === contractAssay1);

    // Check whether we sell on contract assay 0 or 1.
    const normal = checkOrder(
      purseAssay0,
      purseAssay1,
      contractAssay0,
      contractAssay1,
    );

    const payment0P = E(purse0).withdraw(normal ? purseUnit0 : purseUnit1);
    const contractUnit0P = E(contractAssay0).makeUnits(extent0 || 0);
    const contractUnit1P = E(contractAssay1).makeUnits(extent1 || 0);

    const [payment0, contractUnit0, contractUnit1] = await Promise.all([
      payment0P,
      contractUnit0P,
      contractUnit1P,
    ]);

    // =====================
    // === AWAITING TURN ===
    // =====================

    // Clone the offer rules to have a writable object.
    const newOfferRules = JSON.parse(JSON.stringify(offerRules));

    // Hydrate with the resolved units.
    newOfferRules.payoutRules[0].units = contractUnit0;
    newOfferRules.payoutRules[1].units = contractUnit1;
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

    const deposit0P = E(purse0).depositAll(payout[normal ? 0 : 1]);
    const deposit1P = E(purse1).depositAll(payout[normal ? 1 : 0]);

    await Promise.all([deposit0P, deposit1P]);

    // =====================
    // === AWAITING TURN ===
    // =====================

    // updatePursesState(purseName0, purse0);
    // updatePursesState(purseName1, purse1);

    return offerOk;
  }

  const getLocalUnitOps = assay =>
    Promise.all([
      E(assay).getLabel(),
      E(assay).getExtentOps(),
    ]).then(([label, { name, extentOpsArgs = [] }]) =>
      makeUnitOps(label, name, extentOpsArgs),
    );

  // === API

  async function addAssay(assayPetname, regKey, assay) {
    assayPetnameToAssay.init(assayPetname, assay);
    assayToAssayPetname.init(assay, assayPetname);
    regKeyToAssayPetname.init(regKey, assayPetname);
    assayPetnameToRegKey.init(assayPetname, regKey);
    petnameToUnitOps.init(assayPetname, await getLocalUnitOps(assay));
  }

  async function makeEmptyPurse(assayPetname, pursePetname, memo = 'purse') {
    assert(
      !petnameToPurse.has(pursePetname),
      details`Purse name already used in wallet.`,
    );
    const assay = assayPetnameToAssay.get(assayPetname);

    // IMPORTANT: once wrapped, the original purse should never
    // be used otherwise the UI state will be out of sync.
    const doNotUse = await E(assay).makeEmptyPurse(memo);

    const purse = makeObservablePurse(E, doNotUse, () =>
      updatePursesState(pursePetname, doNotUse),
    );

    petnameToPurse.init(pursePetname, purse);
    updatePursesState(pursePetname, purse);
  }

  function deposit(pursePetName, payment) {
    const purse = petnameToPurse.get(pursePetName);
    purse.depositAll(payment);
  }

  function getPurses() {
    return harden([...petnameToPurse.values()]);
  }

  function getOfferDescriptions() {
    // return the live orders sorted by date
    return Array.from(dateToOfferRec)
      .filter(p => p[1].status === 'accept')
      .sort((p1, p2) => p1[0] > p2[0])
      .map(([date, offerRec]) => {
        const {
          offerRules: { payoutRules },
        } = offerRec;
        return harden({ date, payoutRules });
      });
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

  const wallet = harden({
    addAssay,
    makeEmptyPurse,
    deposit,
    getPurses,
    getPurse: petnameToPurse.get,
    addOffer,
    declineOffer,
    acceptOffer,
    getOfferDescriptions,
  });

  return wallet;
}
