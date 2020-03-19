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

  // issuerNames have properties like 'brandRegKey' and 'issuerPetname'.
  const issuerToIssuerNames = makeWeakStore();
  const issuerToBrand = makeWeakStore();
  const brandToIssuer = makeStore();
  const brandToMath = makeStore();

  // OfferDescs that the wallet knows about (the inbox).
  const idToOfferDesc = new Map();

  // Compiled offerDescs (all ready to execute).
  const idToCompiledOfferDescP = new Map();
  const idToCancel = new Map();

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

    // We now have everything we need to provide Zoe, so do the actual withdrawal.
    let payment;
    if (zoeKind === 'roles') {
      // Payments are made for the roles in offerRules.offer.
      payment = {};
      await Promise.all(
        Object.entries(offerRules.offer || {}).map(([role, amount]) => {
          const purse = purses[role];
          if (purse) {
            payment[role] = E(purse).withdraw(amount);
          }
          return payment[role];
        }),
      );
    } else if (zoeKind === 'indexed') {
      // purses/payment are an array indexed by issuer payoutRules.
      payment = await Promise.all(
        offerRules.payoutRules.map(({ kind, amount }, i) => {
          const purse = purses[i];
          if (kind === 'offerAtMost' && purse) {
            return E(purse).withdraw(amount);
          }
          return undefined;
        }),
      );
    } else {
      throw Error(`Unsupported zoeKind ${zoeKind}`);
    }

    // =====================
    // === AWAITING TURN ===
    // =====================

    const { seat, payout: payoutObjP, cancelObj } = await E(zoe).redeem(
      invite,
      offerRules,
      payment,
    );

    // =====================
    // === AWAITING TURN ===
    // =====================

    // Let the caller do what they want with the seat.
    // We'll resolve when deposited.
    const depositedP = payoutObjP.then(payoutObj => {
      const payoutIndexToRole = [];
      return Promise.all(
        Object.entries(payoutObj).map(([role, payoutP], i) => {
          // role may be an index for zoeKind === 'indexed', but we can still treat it
          // as the role name for looking up purses and payouts (just happens to
          // be an integer).
          payoutIndexToRole[i] = role;
          return payoutP;
        }),
      ).then(payoutArray =>
        Promise.all(
          payoutArray.map((payout, payoutIndex) => {
            const role = payoutIndexToRole[payoutIndex];
            const purse = purses[role];
            if (purse && payout) {
              return E(purse).deposit(payout);
            }
            return undefined;
          }),
        ),
      );
    });

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
    return purse.deposit(payment);
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
    };
    idToOfferDesc.set(id, declinedOfferDesc);
    updateInboxState(id, declinedOfferDesc);
  }

  async function cancelOffer(id) {
    const cancel = idToCancel.get(id);
    if (!cancel) {
      return false;
    }

    cancel()
      .then(_ => {
        const offerDesc = idToOfferDesc.get(id);
        const cancelledOfferDesc = {
          ...offerDesc,
          status: 'cancel',
        };
        idToOfferDesc.set(id, cancelledOfferDesc);
        updateInboxState(id, cancelledOfferDesc);
      })
      .catch(e => console.error(`Cannot cancel offer ${id}:`, e));

    return true;
  }

  async function acceptOffer(id) {
    let ret = {};
    let alreadyResolved = false;
    const offerDesc = idToOfferDesc.get(id);
    const rejected = e => {
      if (alreadyResolved) {
        return;
      }
      const rejectOfferDesc = {
        ...offerDesc,
        status: 'rejected',
        error: `${e}`,
      };
      idToOfferDesc.set(id, rejectOfferDesc);
      updateInboxState(id, rejectOfferDesc);
    };

    try {
      const pendingOfferDesc = {
        ...offerDesc,
        status: 'pending',
      };
      idToOfferDesc.set(id, pendingOfferDesc);
      updateInboxState(id, pendingOfferDesc);
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

      idToCancel.set(id, () => {
        alreadyResolved = true;
        return E(cancelObj).cancel();
      });
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
          if (!alreadyResolved) {
            alreadyResolved = true;
            const acceptOfferDesc = {
              ...pendingOfferDesc,
              status: 'accept',
            };
            idToOfferDesc.set(id, acceptOfferDesc);
            updateInboxState(id, acceptOfferDesc);
          }
          // Allow the offer to hook what the return value should be.
          return E(publicAPIHooks).deposited(publicAPI);
        })
        .catch(rejected);
    } catch (e) {
      rejected(e);
      throw e;
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
    publicAPI: { getInvite, deposited, ...publicAPIRest } = {},
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

    // Individual hook functions aren't general-purpose.
    // They're special-purpose for the extension points
    // of the specific wallet we use.  We hydrate them
    // individually to provide some error checking in case
    // the hook specification is wrong or was accidentally
    // supplied in the wrong target.
    return harden({
      publicAPI: {
        // This hook is to get the invite on the publicAPI.
        getInvite: hydrateHook(getInvite),
        // This hook is to return a value for the deposited promise.
        // It is run after all the spoils are deposited to their purses.
        deposited: hydrateHook(deposited),
      },
      seat: {
        // This hook is to run the offer on the seat.
        performOffer: hydrateHook(performOffer),
      },
    });
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
  });

  return wallet;
}
