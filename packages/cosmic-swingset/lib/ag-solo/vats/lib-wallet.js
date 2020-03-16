import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import makeStore from '@agoric/store';
import makeWeakStore from '@agoric/weak-store';
import makeAmountMath from '@agoric/ertp/src/amountMath';

import makeObservablePurse from './observable';
import makeOfferDescCompiler from './offer-compiler';

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
  const purseToIssuer = makeWeakStore();
  const issuerPetnameToIssuer = makeStore();
  const issuerToIssuerNames = makeWeakStore();
  const issuerToBrand = makeWeakStore();
  const brandToIssuer = makeStore();
  const brandToMath = makeStore();

  // OfferDescs that the wallet knows about (the inbox).
  const idToOfferDesc = new Map();

  // Compiled offerDescs (all ready to execute).
  const idToCompiledOfferDescP = new Map();
  const idToCancelObj = new Map();

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
    // issuerNames contains properties like 'brandRegKey' and 'issuerPetname'.
    const issuerNames = issuerToIssuerNames.get(brandToIssuer.get(brand));
    pursesState.set(pursePetname, {
      ...issuerNames,
      pursePetname,
      extent,
    });
    pursesStateChangeHandler(getPursesState());
  }

  async function updateInboxState(id, offerDesc) {
    // Only sent the uncompiled offerDesc to the client.
    inboxState.set(id, offerDesc);
    inboxStateChangeHandler(getInboxState());
  }

  async function executeOffer(compiledOfferDescP, inviteP) {
    const [invite, { zoeKind, purses, offerRules }] = await Promise.all([
      inviteP,
      compiledOfferDescP,
    ]);

    // =====================
    // === AWAITING TURN ===
    // =====================

    assert(
      zoeKind === 'indexed',
      details`Only indexed Zoe is implemented, not ${zoeKind}`,
    );

    // We now have everything we need to provide Zoe, so do the actual withdrawal.
    // purses are an array ordered by issuer payoutRules.
    const payment = await Promise.all(
      offerRules.payoutRules.map(({ kind, amount }, i) => {
        const purse = purses[i];
        if (kind === 'offerAtMost' && purse) {
          return E(purse).withdraw(amount);
        }
        return undefined;
      }),
    );

    // =====================
    // === AWAITING TURN ===
    // =====================

    const { seat, payout: payoutPAP, cancelObj } = await E(zoe).redeem(
      invite,
      offerRules,
      payment,
    );

    // =====================
    // === AWAITING TURN ===
    // =====================

    // Let the caller do what they want with the seat.
    // We'll resolve when deposited.
    const depositedP = payoutPAP.then(payoutAP =>
      Promise.all(payoutAP).then(payoutA =>
        Promise.all(
          payoutA.map((payout, i) => {
            const purse = purses[i];
            if (purse && payout) {
              // console.log('FIGME: deposit', purse, payout);
              return E(purse).deposit(payout);
            }
            return undefined;
          }),
        ),
      ),
    );

    return { depositedP, cancelObj, seat };
  }

  // === API

  async function addIssuer(issuerPetname, issuer, brandRegKey = undefined) {
    issuerPetnameToIssuer.init(issuerPetname, issuer);
    issuerToIssuerNames.init(issuer, { issuerPetname, brandRegKey });
    const [brand, mathName] = await Promise.all([
      E(issuer).getBrand(),
      E(issuer).getMathHelpersName(),
    ]);
    brandToIssuer.init(brand, issuer);
    issuerToBrand.init(issuer, brand);

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
    purseToIssuer.init(purse, issuer);
    updatePursesState(pursePetname, purse);
  }

  function deposit(pursePetName, payment) {
    const purse = petnameToPurse.get(pursePetName);
    purse.deposit(payment);
  }

  function getPurses() {
    return petnameToPurse.entries();
  }

  function getOfferDescriptions() {
    // return the offers sorted by id
    return Array.from(idToOfferDesc)
      .filter(p => p[1].status === 'accept')
      .sort((p1, p2) => p1[0] > p2[0])
      .map(p => harden(p[1]));
  }

  const compileOfferDesc = makeOfferDescCompiler({
    E,
    zoe,
    registrar,

    collections: {
      idToOfferDesc,
      brandToMath,
      issuerToIssuerNames,
      issuerToBrand,
      purseToIssuer,
      petnameToPurse,
    },
  });
  async function addOffer(
    rawOfferDesc,
    hooks = undefined,
    requestContext = { origin: 'unknown' },
  ) {
    const { id: rawId } = rawOfferDesc;
    const id = `${requestContext.origin}#${rawId}`;
    const offerDesc = {
      ...rawOfferDesc,
      id,
      requestContext,
      status: undefined,
      wait: undefined,
    };
    idToOfferDesc.set(id, offerDesc);
    updateInboxState(id, offerDesc);

    // Start compiling the template, saving a promise for it.
    idToCompiledOfferDescP.set(id, compileOfferDesc(id, offerDesc, hooks));

    // Our inbox state may have an enriched offerDesc.
    updateInboxState(id, idToOfferDesc.get(id));
    return id;
  }

  function declineOffer(id) {
    const offerDesc = idToOfferDesc.get(id);
    // Update status, drop the offerRules
    const declinedOfferDesc = {
      ...offerDesc,
      status: 'decline',
      wait: undefined,
    };
    idToOfferDesc.set(id, declinedOfferDesc);
    updateInboxState(id, declinedOfferDesc);
  }

  async function cancelOffer(id) {
    const cancelObj = idToCancelObj.get(id);
    if (cancelObj) {
      await E(cancelObj).cancel();
    }
  }

  async function acceptOffer(id) {
    let ret = {};
    let alreadyAccepted = false;
    const offerDesc = idToOfferDesc.get(id);
    const rejected = e => {
      if (alreadyAccepted) {
        return;
      }
      const rejectOfferDesc = {
        ...offerDesc,
        status: 'rejected',
        error: `${e}`,
        wait: undefined,
      };
      idToOfferDesc.set(id, rejectOfferDesc);
      updateInboxState(id, rejectOfferDesc);
    };

    try {
      const pendingOfferDesc = {
        ...offerDesc,
        status: 'accept',
        wait: -1, // This should be an estimate as to number of ms until offer accepted.
      };
      idToOfferDesc.set(id, pendingOfferDesc);
      const compiledOfferDesc = await idToCompiledOfferDescP.get(id);

      const {
        publicAPI,
        invite,
        hooks: { publicAPI: publicAPIHooks = {}, seat: seatHooks = {} } = {},
      } = compiledOfferDesc;

      const inviteP = invite || E(publicAPIHooks).getInvite(publicAPI);
      const { seat, depositedP, cancelObj } = await executeOffer(
        compiledOfferDesc,
        inviteP,
      );

      idToCancelObj.set(id, cancelObj);
      ret = { seat, publicAPI };

      // =====================
      // === AWAITING TURN ===
      // =====================

      // Don't wait for the offer to finish performing...
      // we need to return control to our caller.
      E(seatHooks)
        .performOffer(seat)
        .catch(e =>
          assert(false, details`seatHooks.performOffer failed with ${e}`),
        );

      // Update status, drop the offerRules
      depositedP
        .then(_ => {
          // We got something back, so no longer pending or rejected.
          alreadyAccepted = true;
          const acceptOfferDesc = { ...pendingOfferDesc, wait: undefined };
          idToOfferDesc.set(id, acceptOfferDesc);
          updateInboxState(id, acceptOfferDesc);
          return E(publicAPIHooks).offerAccepted(publicAPI);
        })
        .catch(rejected);
    } catch (e) {
      rejected(e);
    }
    return ret;
  }

  function getIssuers() {
    return issuerPetnameToIssuer.entries();
  }

  const hydrateHook = ([hookMethod, ...hookArgs] = []) => object => {
    if (hookMethod === undefined) {
      return undefined;
    }
    return E(object)[hookMethod](...hookArgs);
  };

  function hydrateHooks({
    publicAPI: { getInvite, offerAccepted, ...publicAPIRest } = {},
    seat: { performOffer, ...seatRest } = {},
    ...targetsRest
  } = {}) {
    const assertSpecs = [
      [targetsRest, 'targets'],
      [publicAPIRest, 'publicAPI hooks'],
      [seatRest, 'seat hooks'],
    ];
    for (const [rest, desc] of assertSpecs) {
      assert(
        Object.keys(rest).length === 0,
        details`Unrecognized extra ${desc} ${rest}`,
      );
    }

    return harden({
      publicAPI: {
        getInvite: hydrateHook(getInvite),
        accepted: hydrateHook(offerAccepted),
      },
      seat: {
        performOffer: hydrateHook(performOffer),
      },
    });
  }

  function ping(cb, data) {
    // console.log('FIGME: pinged with', cb, String(cb));
    return E(cb).pong(data);
  }

  const wallet = harden({
    addIssuer,
    makeEmptyPurse,
    deposit,
    getIssuers,
    getPurses,
    getPurse: petnameToPurse.get,
    getPurseIssuer: petname => purseToIssuer.get(petnameToPurse.get(petname)),
    getIssuerNames: issuerToIssuerNames.get,
    hydrateHooks,
    addOffer,
    declineOffer,
    cancelOffer,
    acceptOffer,
    getOfferDescriptions,
    ping,
  });

  return wallet;
}
