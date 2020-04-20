import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import makeStore from '@agoric/store';
import makeWeakStore from '@agoric/weak-store';
import makeAmountMath from '@agoric/ertp/src/amountMath';

import makeObservablePurse from './observable';
import makeOfferCompiler from './offer-compiler';

// does nothing
const noActionStateChangeHandler = _newState => {};

export async function makeWallet(
  E,
  zoe,
  registry,
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

  // Offers that the wallet knows about (the inbox).
  const idToOffer = makeStore();

  // Compiled offers (all ready to execute).
  const idToCompiledOfferP = new Map();
  const idToCancel = new Map();
  const idToOfferHandle = new Map();
  const idToOutcome = new Map();

  // Client-side representation of the purses inbox;
  const pursesState = new Map();
  const inboxState = new Map();

  function getPursesState() {
    const entries = [...pursesState.entries()];
    // Sort for determinism.
    const values = entries
      .sort(([id1], [id2]) => id1 > id2)
      .map(([_id, value]) => value);

    return JSON.stringify(values);
  }

  function getInboxState() {
    const entries = [...inboxState.entries()];
    // Sort for determinism.
    const values = entries
      .sort(([id1], [id2]) => id1 > id2)
      .map(([_id, value]) => value);

    return JSON.stringify(values);
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

  async function updateInboxState(id, offer) {
    // Only sent the uncompiled offer to the client.
    inboxState.set(id, offer);
    inboxStateChangeHandler(getInboxState());
  }

  async function executeOffer(compiledOfferP, inviteP) {
    const [invite, { purses, proposal }] = await Promise.all([
      inviteP,
      compiledOfferP,
    ]);

    // =====================
    // === AWAITING TURN ===
    // =====================

    // We now have everything we need to provide Zoe, so do the actual withdrawal.
    // Payments are made for the keywords in proposal.give.
    const payment = {};
    await Promise.all(
      Object.entries(proposal.give || {}).map(([keyword, amount]) => {
        const purse = purses[keyword];
        if (purse) {
          return E(purse)
            .withdraw(amount)
            .then(pmt => (payment[keyword] = pmt));
        }
        return undefined;
      }),
    );

    // =====================
    // === AWAITING TURN ===
    // =====================

    const {
      payout: payoutObjP,
      cancelObj,
      outcome: outcomeP,
      offerHandle: offerHandleP,
    } = await E(zoe).offer(invite, proposal, payment);

    // =====================
    // === AWAITING TURN ===
    // =====================
    // This settles when the payments are escrowed in Zoe
    const offerHandle = await offerHandleP;

    // =====================
    // === AWAITING TURN ===
    // =====================
    // This settles when the offer hook completes.
    const outcome = await outcomeP;

    // We'll resolve when deposited.
    const depositedP = payoutObjP.then(payoutObj => {
      const payoutIndexToKeyword = [];
      return Promise.all(
        Object.entries(payoutObj).map(([keyword, payoutP], i) => {
          // keyword may be an index for zoeKind === 'indexed', but we can still treat it
          // as the keyword name for looking up purses and payouts (just happens to
          // be an integer).
          payoutIndexToKeyword[i] = keyword;
          return payoutP;
        }),
      ).then(payoutArray =>
        Promise.all(
          payoutArray.map(async (payoutP, payoutIndex) => {
            const keyword = payoutIndexToKeyword[payoutIndex];
            const purse = purses[keyword];
            if (purse && payoutP) {
              const payout = await payoutP;
              return E(purse).deposit(payout);
            }
            return undefined;
          }),
        ),
      );
    });

    return { depositedP, cancelObj, outcome, offerHandle };
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

  function getOffers({ origin = null } = {}) {
    // return the offers sorted by id
    return idToOffer
      .entries()
      .filter(
        ([_id, offer]) =>
          origin === null ||
          (offer.requestContext && offer.requestContext.origin === origin),
      )
      .sort(([id1], [id2]) => id1 > id2)
      .map(([_id, offer]) => harden(offer));
  }

  const compileOffer = makeOfferCompiler({
    E,
    zoe,
    registry,

    collections: {
      idToOffer,
      brandToMath,
      issuerToIssuerNames,
      issuerToBrand,
      purseToIssuer,
      petnameToPurse,
    },
  });
  async function addOffer(
    rawOffer,
    hooks = undefined,
    requestContext = { origin: 'unknown' },
  ) {
    const { id: rawId } = rawOffer;
    const id = `${requestContext.origin}#${rawId}`;
    const offer = {
      ...rawOffer,
      id,
      requestContext,
      status: undefined,
    };
    idToOffer.init(id, offer);
    updateInboxState(id, offer);

    // Start compiling the template, saving a promise for it.
    idToCompiledOfferP.set(id, compileOffer(id, offer, hooks));

    // Our inbox state may have an enriched offer.
    updateInboxState(id, idToOffer.get(id));
    return id;
  }

  function declineOffer(id) {
    const offer = idToOffer.get(id);
    // Update status, drop the proposal
    const declinedOffer = {
      ...offer,
      status: 'decline',
    };
    idToOffer.set(id, declinedOffer);
    updateInboxState(id, declinedOffer);
  }

  async function cancelOffer(id) {
    const cancel = idToCancel.get(id);
    if (!cancel) {
      return false;
    }

    cancel()
      .then(_ => {
        const offer = idToOffer.get(id);
        const cancelledOffer = {
          ...offer,
          status: 'cancel',
        };
        idToOffer.set(id, cancelledOffer);
        updateInboxState(id, cancelledOffer);
      })
      .catch(e => console.error(`Cannot cancel offer ${id}:`, e));

    return true;
  }

  async function acceptOffer(id) {
    let ret = {};
    let alreadyResolved = false;
    const offer = idToOffer.get(id);
    const rejected = e => {
      if (alreadyResolved) {
        return;
      }
      const rejectOffer = {
        ...offer,
        status: 'rejected',
        error: `${e}`,
      };
      idToOffer.set(id, rejectOffer);
      updateInboxState(id, rejectOffer);
    };

    try {
      const pendingOffer = {
        ...offer,
        status: 'pending',
      };
      idToOffer.set(id, pendingOffer);
      updateInboxState(id, pendingOffer);
      const compiledOffer = await idToCompiledOfferP.get(id);

      const {
        publicAPI,
        invite,
        hooks: { publicAPI: publicAPIHooks = {} } = {},
      } = compiledOffer;

      const inviteP = invite || E(publicAPIHooks).getInvite(publicAPI);
      const {
        depositedP,
        cancelObj,
        outcome,
        offerHandle,
      } = await executeOffer(compiledOffer, inviteP);

      idToCancel.set(id, () => {
        alreadyResolved = true;
        return E(cancelObj).cancel();
      });
      idToOfferHandle.set(id, offerHandle);

      // The outcome is most often a string that can be returned, but
      // it could be an object. We don't do anything currently if it
      // is an object, but we will store it here for future use.
      idToOutcome.set(id, outcome);

      ret = { outcome };

      // Update status, drop the proposal
      depositedP
        .then(_ => {
          // We got something back, so no longer pending or rejected.
          if (!alreadyResolved) {
            alreadyResolved = true;
            const acceptedOffer = {
              ...pendingOffer,
              status: 'accept',
            };
            idToOffer.set(id, acceptedOffer);
            updateInboxState(id, acceptedOffer);
          }
          // Allow the offer to hook what the return value should be.
          return E(publicAPIHooks).deposited(publicAPI);
        })
        .catch(rejected);
    } catch (e) {
      console.error('Have error', e);
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
    ...targetsRest
  } = {}) {
    const assertSpecs = [
      [targetsRest, 'targets'],
      [publicAPIRest, 'publicAPI hooks'],
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
    getOffers,
    getOfferHandle: id => idToOfferHandle.get(id),
    getOfferHandles: ids => ids.map(wallet.getOfferHandle),
  });

  return wallet;
}
