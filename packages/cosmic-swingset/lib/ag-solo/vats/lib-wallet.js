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

  async function makeOffer(date) {
    const {
      meta: { instanceId, ...rest },
      offerRules,
    } = dateToOfferRec.get(date);

    // Collapse purseName0, purseName1, ... into purseNames
    const rawPurses = [];
    for (let i = 0; i < offerRules.payoutRules.length; i += 1) {
      const purseName = rest[`purseName${i}`];
      if (purseName === undefined) {
        break;
      }
      rawPurses.push(petnameToPurse.get(purseName));
    }

    const { payoutRules } = offerRules;

    const instanceP = E(registrar)
      .get(instanceId)
      .then(instanceHandle => E(zoe).getInstance(instanceHandle));
    const regAssaysAP = payoutRules.map(({ units: { assayId } }) =>
      E(registrar).get(assayId),
    );
    const regAssaysP = Promise.all(regAssaysAP);
    const regUnitsP = Promise.all(
      payoutRules.map(({ units: { extent } }, i) =>
        E(regAssaysAP[i]).makeUnits(extent || 0),
      ),
    );
    const purseAssaysP = Promise.all(
      rawPurses.map(purse => E(purse).getAssay()),
    );

    const [
      {
        terms: { assays: contractAssays },
        publicAPI,
      },
      regAssays,
      regUnits,
      purseAssays,
    ] = await Promise.all([instanceP, regAssaysP, regUnitsP, purseAssaysP]);

    // =====================
    // === AWAITING TURN ===
    // =====================

    // Order the purses by registered assays.
    const purseAssaysRemaining = [...purseAssays];
    const payoutOrderedPurses = regAssays.map(regAssay => {
      const i = purseAssaysRemaining.indexOf(regAssay);
      if (i < 0) {
        return undefined;
      }
      // Strike out this assay from the remaining ones.
      purseAssaysRemaining[i] = undefined;
      return rawPurses[i];
    });

    const invite = await E(publicAPI).makeInvite();

    // =====================
    // === AWAITING TURN ===
    // =====================

    // Ensure that the offered and contract assays match.
    contractAssays.forEach((contractAssay, i) =>
      assert(contractAssay, regAssays[i]),
    );

    // Clone the offer rules to have a writable object.
    const newOfferRules = JSON.parse(JSON.stringify(offerRules));

    // Hydrate with the resolved units.
    newOfferRules.payoutRules.forEach(
      (payoutRule, i) => (payoutRule.units = regUnits[i]),
    );
    harden(newOfferRules);

    // Look up the payments in the array ordered by registered assays.
    const payment = await Promise.all(
      newOfferRules.payoutRules.map(({ kind, units }, i) => {
        const purse = payoutOrderedPurses[i];
        if (kind === 'offerAtMost' && purse) {
          return E(purse).withdraw(units);
        }
        return undefined;
      }),
    );

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

    // Deposit all the spoils.
    await Promise.all(
      payout.map((pay, i) => {
        const purse = payoutOrderedPurses[i];
        if (purse && pay) {
          return E(purse).depositAll(pay);
        }
        return undefined;
      }),
    );

    // =====================
    // === AWAITING TURN ===
    // =====================

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
