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
    let offerOk = false;

    const {
      meta: { purseName0, purseName1, instanceId },
      offerRules,
    } = dateToOfferRec.get(date);

    // TODO balance check
    // use unit/ops purse balance doen't include units
    // return if purse balance is not > amount to withdraw
    // if (!unitOps.includes(purse.getBalance(), unitsToWithdraw) return
    // unitOps = assay.getUnitOps()
    // if (purse0.getBalance() < extent0) return; // todo message

    const instanceHandle = await E(registrar).get(instanceId);

    // Get the assays in the contract.
    // Get the contract instance.
    const {
      terms: { assays: contractAssays },
      instance,
    } = await E(zoe).getInstance(instanceHandle);

    // Extract extents and assayIds from the offer rules skeleton.
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

    // Find the correcponsing assays by id in the registrar.
    const registryAssays = await Promise.all([
      E(registrar).get(assayId0),
      E(registrar).get(assayId1),
    ]);

    // Reconstruct the units.
    const units = await Promise.all([
      E(registryAssays[0]).makeUnits(extent0 || 0), // use from registry
      E(registryAssays[1]).makeUnits(extent1 || 0), // use from registry
      E(contractAssays[2]).makeUnits(extent2 || 0), // default from contract
    ]);

    // Clone the offer rules to make them writable.
    const newOfferRules = JSON.parse(JSON.stringify(offerRules));

    // Hydrate by deconstruction.
    [
      newOfferRules.payoutRules[0].units,
      newOfferRules.payoutRules[1].units,
      newOfferRules.payoutRules[2].units,
    ] = units;
    harden(newOfferRules);

    const purse0 = nameToPurse.get(purseName0);
    const purse1 = nameToPurse.get(purseName1);
    const purseAssays = await Promise.all([
      E(purse0).getAssay(),
      E(purse1).getAssay(),
    ]);

    try {
      const normal = checkOrder(
        purseAssays[0],
        purseAssays[1],
        registryAssays[0],
        registryAssays[1],
      );

      const payment0 = await E(purse0).withdraw(normal ? units[0] : units[1]);
      const payments = [
        normal ? payment0 : undefined,
        normal ? undefined : payment0,
      ];

      const { escrowReceipt, payout } = await E(zoe).escrow(
        newOfferRules,
        payments,
      );

      offerOk = await E(instance).makeOffer(escrowReceipt);

      if (offerOk) {
        const [payout0, payout1] = await payout;
        await Promise.all([
          E(purse0).depositAll(normal ? payout0 : payout1),
          E(purse1).depositAll(normal ? payout1 : payout0),
        ]);
      }
    } catch (e) {
      // if balance > empty payment has not been claimed.
      const recoveryPayment = purseAssays[0].claimAll();
      await E(purse0).depositAll(recoveryPayment);
    }

    updatePursesState(purseName0, purse0);
    updatePursesState(purseName1, purse1);

    return offerOk;
  }

  // === API

  async function addPurse(purse) {
    const purseName = await E(purse).getName();
    insist(!nameToPurse.has(purseName))`Purse name already used in wallet.`;

    const assay = await E(purse).getAssay();
    const { allegedName } = await E(assay).getLabel();
    const assayId = await E(registrar).register(allegedName, assay);

    nameToPurse.set(purseName, purse);
    nameToAssayId.set(purseName, assayId);

    await updatePursesState(purseName, purse);
  }

  function getPurses() {
    return harden([...nameToPurse.values()]);
  }

  async function addOffer(offerRec) {
    const {
      meta: { date },
    } = offerRec;
    dateToOfferRec.set(date, offerRec);
    await updateInboxState(date, offerRec);
  }

  function declineOffer(date) {
    const { meta } = dateToOfferRec.get(date);
    // Update status, drop the offerRules
    const declineedOfferRec = { meta: { ...meta, status: 'decline' } };
    dateToOfferRec.set(date, declineedOfferRec);
    updateInboxState(date, declineedOfferRec);
  }

  async function acceptOffer(date) {
    const offerOk = await makeOffer(date);
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
      addOffer,
      declineOffer,
      acceptOffer,
    },
    adminFacet: {},
    readFacet: {},
  });

  return wallet;
}
