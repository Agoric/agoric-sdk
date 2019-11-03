import harden from '@agoric/harden';
import { insist } from '@agoric/ertp/util/insist';

function mockStateChangeHandler(_newState) {
  // does nothing
}

export async function makeWallet(
  E,
  log,
  host,
  zoe,
  registrar,
  pursesStateChangeHandler = mockStateChangeHandler,
  inboxStateChangeHandler = mockStateChangeHandler,
) {
  // Map of purses in the wallet by pet name. Assume immutable.
  const nameToPurse = new Map();
  const nameToAssayId = new Map();

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

  async function updatePursesState(purseName, purse) {
    const balance = await E(purse).getBalance();
    const {
      extent,
      label: { allegedName },
    } = balance;
    const assayId = nameToAssayId.get(purseName);
    pursesState.set(purseName, { purseName, assayId, allegedName, extent });
    pursesStateChangeHandler(getPursesState());
  }

  async function updateInboxState(date, offerRec) {
    // Only sent the metadata to the client.
    inboxState.set(date, offerRec.meta);
    inboxStateChangeHandler(getInboxState());
  }

  function makeObservablePurse(purse, onFulfilled) {
    return {
      getName() {
        return E(purse).getName();
      },
      getAssay() {
        return E(purse).getAssay();
      },
      getBalance() {
        return E(purse).getBalance();
      },
      depositExactly(...args) {
        return E(purse)
          .depositExactly(...args)
          .then(result => {
            onFulfilled();
            return result;
          });
      },
      depositAll(...args) {
        return E(purse)
          .depositAll(...args)
          .then(result => {
            onFulfilled();
            return result;
          });
      },
      withdraw(...args) {
        return E(purse)
          .withdraw(...args)
          .then(result => {
            onFulfilled();
            return result;
          });
      },
      withdrawAll(...args) {
        return E(purse)
          .withdrawAll(...args)
          .then(result => {
            onFulfilled();
            return result;
          });
      },
    };
  }

  function checkOrder(a0, a1, b0, b1) {
    if (a0 === b0 && a1 === b1) {
      return true;
    }

    if (a0 === b1 && a1 === b0) {
      return false;
    }

    throw new TypeError('Canot resove assay ordering');
  }

  async function makeOffer(date) {
    const {
      meta: { purseName0, purseName1, instanceId },
      offerRules,
    } = dateToOfferRec.get(date);

    const purse0 = nameToPurse.get(purseName0);
    const purse1 = nameToPurse.get(purseName1);

    const {
      payoutRules: [
        {
          units: { extent: extent0, assayId: assayId0 },
        },
        {
          units: { extent: extent1, assayId: assayId1 },
        },
        {
          units: { extent: extent2 },
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
        assays: [contractAssay0, contractAssay1, contractAssay2],
      },
      instance,
    } = await E(zoe).getInstance(instanceHandle);

    // =====================
    // === AWAITING TURN ===
    // =====================

    insist(contractAssay0 === regAssay0 && regAssay1 === contractAssay1);

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
    const contractUnit2P = E(contractAssay2).makeUnits(extent2 || 0);

    const [
      payment0,
      contractUnit0,
      contractUnit1,
      contractUnit2,
    ] = await Promise.all([
      payment0P,
      contractUnit0P,
      contractUnit1P,
      contractUnit2P,
    ]);

    // =====================
    // === AWAITING TURN ===
    // =====================

    // Clone the offer rules to have a writable object.
    const newOfferRules = JSON.parse(JSON.stringify(offerRules));

    // Hydrate with the resolved units.
    newOfferRules.payoutRules[0].units = contractUnit0;
    newOfferRules.payoutRules[1].units = contractUnit1;
    newOfferRules.payoutRules[2].units = contractUnit2;
    harden(newOfferRules);

    const payment = normal
      ? [payment0, undefined, undefined]
      : [undefined, payment0, undefined];

    const { escrowReceipt, payout: payoutP } = await E(zoe).escrow(
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

    const [offerOk, payout] = await Promise.all([
      E(instance).makeOffer(escrowReceipt),
      payoutP,
    ]);

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

  // === API

  async function addPurse(purse) {
    const purseNameP = E(purse).getName();
    const assayP = E(purse).getAssay();
    const labelP = E(assayP).getLabel();

    const [purseName, assay, { allegedName }] = await Promise.all([
      purseNameP,
      assayP,
      labelP,
    ]);

    // =====================
    // === AWAITING TURN ===
    // =====================

    insist(!nameToPurse.has(purseName))`Purse name already used in wallet.`;

    const assayId = await E(registrar).register(allegedName, assay);

    // =====================
    // === AWAITING TURN ===
    // =====================

    // IMPORTANT: once wrapped, the original purse shoudl never
    // be used otherwise the UI state will be out of sync.

    const observablePurse = makeObservablePurse(purse, () =>
      updatePursesState(purseName, purse),
    );

    nameToPurse.set(purseName, observablePurse);
    nameToAssayId.set(purseName, assayId);

    updatePursesState(purseName, purse);
  }

  function getPurses() {
    return harden([...nameToPurse.values()]);
  }

  function getPurse(name) {
    return nameToPurse.get(name);
  }

  function addOffer(offerRec) {
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
    userFacet: {
      addPurse,
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
