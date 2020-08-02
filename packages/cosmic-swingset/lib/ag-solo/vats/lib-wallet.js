/* global harden */

import { assert, details, q } from '@agoric/assert';
import makeStore from '@agoric/store';
import makeWeakStore from '@agoric/weak-store';
import makeAmountMath from '@agoric/ertp/src/amountMath';

// TODO: move the Table abstraction out of Zoe
import { makeTable, makeValidateProperties } from '@agoric/zoe/src/table';
import { E } from '@agoric/eventual-send';

import { makeMarshal } from '@agoric/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { producePromise } from '@agoric/produce-promise';

import makeObservablePurse from './observable';
import { makeDehydrator } from './lib-dehydrate';

// does nothing
const noActionStateChangeHandler = _newState => {};

export async function makeWallet({
  zoe,
  board,
  pursesStateChangeHandler = noActionStateChangeHandler,
  inboxStateChangeHandler = noActionStateChangeHandler,
}) {
  // Create the petname maps so we can dehydrate information sent to
  // the frontend.
  const { makeMapping, dehydrate, edgeMapping } = makeDehydrator();
  const purseMapping = makeMapping('purse');
  const brandMapping = makeMapping('brand');
  const contactMapping = makeMapping('contact');
  const instanceMapping = makeMapping('instance');
  const installationMapping = makeMapping('installation');

  // Brand Table
  // Columns: key:brand | issuer | amountMath
  const makeBrandTable = () => {
    const validateSomewhat = makeValidateProperties(
      harden(['brand', 'issuer', 'amountMath']),
    );

    const issuersInProgress = makeStore('issuer');
    const issuerToBrand = makeWeakStore('issuer');
    const makeCustomProperties = table =>
      harden({
        addIssuer: issuerP => {
          return Promise.resolve(issuerP).then(issuer => {
            if (issuersInProgress.has(issuer)) {
              // a promise which resolves to the issuer record
              return issuersInProgress.get(issuer);
            }

            // remote calls which immediately return a promise
            const mathHelpersNameP = E(issuer).getMathHelpersName();
            const brandP = E(issuer).getBrand();

            // a promise for a synchronously accessible record
            const synchronousRecordP = Promise.all([
              brandP,
              mathHelpersNameP,
            ]).then(([brand, mathHelpersName]) => {
              if (!issuerToBrand.has(issuer)) {
                const amountMath = makeAmountMath(brand, mathHelpersName);
                const issuerRecord = {
                  issuer,
                  brand,
                  amountMath,
                };
                table.create(issuerRecord, brand);
                issuerToBrand.init(issuer, brand);
              }
              issuersInProgress.delete(issuer);
              return table.get(brand);
            });
            issuersInProgress.init(issuer, synchronousRecordP);
            return synchronousRecordP;
          });
        },
        getBrandForIssuer: issuerToBrand.get,
        hasIssuer: issuerToBrand.has,
      });
    const brandTable = makeTable(
      validateSomewhat,
      'brand',
      makeCustomProperties,
    );
    return brandTable;
  };

  const brandTable = makeBrandTable();
  const purseToBrand = makeWeakStore('purse');
  const brandToDepositFacetId = makeStore('brand');
  const brandToAutoDepositPurse = makeStore('brand');

  // Offers that the wallet knows about (the inbox).
  const idToOffer = makeStore('offerId');
  const idToNotifierP = makeStore('offerId');

  // Compiled offers (all ready to execute).
  const idToCompiledOfferP = new Map();
  const idToComplete = new Map();
  const idToOfferHandle = new Map();
  const idToOutcome = new Map();

  // Client-side representation of the purses inbox;
  const pursesState = new Map();
  const pursesFullState = new Map();
  const inboxState = new Map();

  // The default Zoe invite purse is used to make an offer.
  let zoeInvitePurse;

  function getSortedValues(map) {
    const entries = [...map.entries()];
    // Sort for determinism.
    const values = entries
      .sort(([id1], [id2]) => id1 > id2)
      .map(([_id, value]) => value);

    return JSON.stringify(values);
  }

  function getPursesState() {
    return getSortedValues(pursesState);
  }

  function getInboxState() {
    return getSortedValues(inboxState);
  }

  const noOp = () => {};
  const identityFn = slot => slot;
  // Instead of { body, slots }, fill the slots. This is useful for
  // display but not for data processing, since the special identifier
  // @qclass is lost.
  const { unserialize: fillInSlots } = makeMarshal(noOp, identityFn);

  const {
    notifier: pursesNotifier,
    updater: pursesUpdater,
  } = makeNotifierKit();

  async function updatePursesState(pursePetname, purse) {
    const purseKey = purseMapping.implode(pursePetname);
    for (const key of pursesState.keys()) {
      if (!purseMapping.petnameToVal.has(purseMapping.explode(key))) {
        pursesState.delete(key);
      }
    }
    const currentAmount = await E(purse).getCurrentAmount();
    const { value, brand } = currentAmount;
    const brandPetname = brandMapping.valToPetname.get(brand);
    const dehydratedCurrentAmount = dehydrate(currentAmount);
    const brandBoardId = await E(board).getId(brand);

    let depositBoardId;
    if (
      brandToAutoDepositPurse.has(brand) &&
      brandToAutoDepositPurse.get(brand) === purse &&
      brandToDepositFacetId.has(brand)
    ) {
      // We have a depositId for the purse.
      depositBoardId = brandToDepositFacetId.get(brand);
    }
    const jstate = {
      brandBoardId,
      ...(depositBoardId && { depositBoardId }),
      brandPetname,
      pursePetname,
      value,
      currentAmountSlots: dehydratedCurrentAmount,
      currentAmount: fillInSlots(dehydratedCurrentAmount),
    };
    pursesState.set(purseKey, jstate);
    pursesFullState.set(
      purse,
      harden({
        ...jstate,
        purse,
        brand,
        actions: {
          async send(receiverP, valueToSend) {
            const { amountMath } = brandTable.get(brand);
            const amount = amountMath.make(valueToSend);
            const payment = await E(purse).withdraw(amount);
            try {
              await E(receiverP).receive(payment);
            } catch (e) {
              // Recover the failed payment.
              await E(purse).deposit(payment);
              throw e;
            }
          },
          receive(payment) {
            return E(purse).deposit(payment);
          },
          deposit(payment, amount = undefined) {
            return E(purse).deposit(payment, amount);
          },
        },
      }),
    );
    pursesUpdater.updateState([...pursesFullState.values()]);
    pursesStateChangeHandler(getPursesState());
  }

  async function updateAllPurseState() {
    return Promise.all(
      purseMapping.petnameToVal
        .entries()
        .map(([petname, purse]) => updatePursesState(petname, purse)),
    );
  }

  const display = value => fillInSlots(dehydrate(harden(value)));

  const displayProposal = proposalTemplate => {
    const { want, give, exit = { onDemand: null } } = proposalTemplate;
    const compile = pursePetnameValueKeywordRecord => {
      if (pursePetnameValueKeywordRecord === undefined) {
        return undefined;
      }
      return Object.fromEntries(
        Object.entries(pursePetnameValueKeywordRecord).map(
          ([keyword, { pursePetname, value, amount, purse }]) => {
            if (!amount) {
              // eslint-disable-next-line no-use-before-define
              purse = getPurse(pursePetname);
              amount = { value };
            } else {
              pursePetname = purseMapping.valToPetname.get(purse);
            }

            amount = harden({ ...amount, brand: purseToBrand.get(purse) });
            const displayAmount = display(amount);
            return [
              keyword,
              {
                pursePetname,
                purse,
                amount: displayAmount,
              },
            ];
          },
        ),
      );
    };
    const proposal = {
      want: compile(want),
      give: compile(give),
      exit,
    };
    return proposal;
  };

  async function updateInboxState(id, offer) {
    // Only sent the uncompiled offer to the client.
    const {
      instanceHandleBoardId,
      installationHandleBoardId,
      proposalTemplate,
    } = offer;
    // We could get the instanceHandle and installationHandle from the
    // board and store them to prevent having to make this call each
    // time, but if we want the offers to be able to sent to the
    // frontend, we cannot store the instanceHandle and
    // installationHandle in these offer objects because the handles
    // are presences and we don't wish to send presences to the
    // frontend.
    const instanceHandle = await E(board).getValue(instanceHandleBoardId);
    const installationHandle = await E(board).getValue(
      installationHandleBoardId,
    );
    const instance = display(instanceHandle);
    const installation = display(installationHandle);
    const alreadyDisplayed =
      inboxState.has(id) && inboxState.get(id).proposalForDisplay;

    const offerForDisplay = {
      ...offer,
      instancePetname: instance.petname,
      installationPetname: installation.petname,
      proposalForDisplay: displayProposal(alreadyDisplayed || proposalTemplate),
    };

    inboxState.set(id, offerForDisplay);
    inboxStateChangeHandler(getInboxState());
  }

  async function updateAllInboxState() {
    return Promise.all(
      Array.from(inboxState.entries()).map(([id, offer]) =>
        updateInboxState(id, offer),
      ),
    );
  }

  // TODO: fix this horribly inefficient update on every potential
  // petname change.
  async function updateAllState() {
    return updateAllPurseState().then(updateAllInboxState);
  }

  // handle the update, which has already resolved to a record. If the offer is
  // 'done', mark the offer 'complete', otherwise resubscribe to the notifier.
  function updateOrResubscribe(id, offerHandle, update) {
    const { updateCount } = update;
    if (updateCount === undefined) {
      // TODO do we still need these?
      idToOfferHandle.delete(id);

      const offer = idToOffer.get(id);
      const completedOffer = {
        ...offer,
        status: 'complete',
      };
      idToOffer.set(id, completedOffer);
      updateInboxState(id, completedOffer);
      idToNotifierP.delete(id);
    } else {
      E(idToNotifierP.get(id))
        .getUpdateSince(updateCount)
        .then(nextUpdate => updateOrResubscribe(id, offerHandle, nextUpdate));
    }
  }

  // There's a new offer. Ask Zoe to notify us when the offer is complete.
  async function subscribeToNotifier(id, offerHandle) {
    E(zoe)
      .getOfferNotifier(offerHandle)
      .then(offerNotifierP => {
        if (!idToNotifierP.has(id)) {
          idToNotifierP.init(id, offerNotifierP);
        }
        E(offerNotifierP)
          .getUpdateSince()
          .then(update => updateOrResubscribe(id, offerHandle, update));
      });
  }

  async function executeOffer(compiledOfferP) {
    // =====================
    // === AWAITING TURN ===
    // =====================

    const { inviteP, purseKeywordRecord, proposal } = await compiledOfferP;

    // =====================
    // === AWAITING TURN ===
    // =====================

    const invite = await inviteP;

    // We now have everything we need to provide Zoe, so do the actual withdrawal.
    // Payments are made for the keywords in proposal.give.
    const keywords = [];

    const paymentPs = Object.entries(proposal.give || {}).map(
      ([keyword, amount]) => {
        const purse = purseKeywordRecord[keyword];
        assert(
          purse !== undefined,
          details`purse was not found for keyword ${q(keyword)}`,
        );
        keywords.push(keyword);
        return E(purse).withdraw(amount);
      },
    );

    // =====================
    // === AWAITING TURN ===
    // =====================

    const payments = await Promise.all(paymentPs);

    const paymentKeywordRecord = Object.fromEntries(
      keywords.map((keyword, i) => [keyword, payments[i]]),
    );

    // =====================
    // === AWAITING TURN ===
    // =====================

    const {
      payout: payoutObjP,
      completeObj,
      outcome: outcomeP,
      offerHandle: offerHandleP,
    } = await E(zoe).offer(
      invite,
      harden(proposal),
      harden(paymentKeywordRecord),
    );

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
            const purse = purseKeywordRecord[keyword];
            if (purse && payoutP) {
              const payout = await payoutP;
              // eslint-disable-next-line no-use-before-define
              return addPayment(payout, purse);
            }
            return undefined;
          }),
        ),
      );
    });

    return { depositedP, completeObj, outcome, offerHandle };
  }

  // === API

  const addIssuer = (petnameForBrand, issuer, makePurse = false) => {
    const issuerSavedP = brandTable.addIssuer(issuer);
    const addBrandPetname = ({ brand }) => {
      let p;
      const already = brandMapping.valToPetname.has(brand);
      brandMapping.suggestPetname(petnameForBrand, brand);
      if (!already && makePurse) {
        // eslint-disable-next-line no-use-before-define
        p = makeEmptyPurse(petnameForBrand, petnameForBrand);
      } else {
        p = Promise.resolve();
      }
      return p.then(
        _ => `issuer ${q(petnameForBrand)} successfully added to wallet`,
      );
    };
    return issuerSavedP.then(addBrandPetname).then(updateAllState);
  };

  const {
    updater: contactsUpdater,
    notifier: contactsNotifier,
  } = makeNotifierKit();

  const addContact = async (petname, actions) => {
    const depositFacet = harden({
      receive(payment) {
        return E(actions).receive(payment);
      },
    });
    const depositBoardId = await E(board).getId(depositFacet);
    const contact = harden({
      actions,
      depositBoardId,
    });

    contactMapping.suggestPetname(petname, contact);
    contactsUpdater.updateState([...contactMapping.petnameToVal.entries()]);
    return contact;
  };

  const addInstance = (petname, instanceHandle) => {
    // We currently just add the petname mapped to the instanceHandle
    // value, but we could have a list of known instances for
    // possible display in the wallet.
    instanceMapping.suggestPetname(petname, instanceHandle);
    // We don't wait for the update before returning.
    updateAllState();
    return `instance ${q(petname)} successfully added to wallet`;
  };

  const addInstallation = (petname, installationHandle) => {
    // We currently just add the petname mapped to the installationHandle
    // value, but we could have a list of known installations for
    // possible display in the wallet.
    installationMapping.suggestPetname(petname, installationHandle);
    // We don't wait for the update before returning.
    updateAllState();
    return `installation ${q(petname)} successfully added to wallet`;
  };

  const makeEmptyPurse = async (brandPetname, petnameForPurse) => {
    assert(
      !purseMapping.petnameToVal.has(petnameForPurse),
      details`Purse petname ${q(petnameForPurse)} already used in wallet.`,
    );
    const brand = brandMapping.petnameToVal.get(brandPetname);
    const { issuer } = brandTable.get(brand);

    // IMPORTANT: once wrapped, the original purse should never
    // be used otherwise the UI state will be out of sync.
    const doNotUse = await E(issuer).makeEmptyPurse();

    const purse = makeObservablePurse(E, doNotUse, () =>
      updatePursesState(purseMapping.valToPetname.get(purse), purse),
    );

    purseToBrand.init(purse, brand);
    purseMapping.suggestPetname(petnameForPurse, purse);
    updatePursesState(purseMapping.valToPetname.get(purse), purse);
  };

  function deposit(pursePetname, payment) {
    const purse = purseMapping.petnameToVal.get(pursePetname);
    return purse.deposit(payment);
  }

  function getPurses() {
    return purseMapping.petnameToVal.entries();
  }

  function getPurse(pursePetname) {
    return purseMapping.petnameToVal.get(pursePetname);
  }

  function getPurseIssuer(pursePetname) {
    const purse = purseMapping.petnameToVal.get(pursePetname);
    const brand = purseToBrand.get(purse);
    const { issuer } = brandTable.get(brand);
    return issuer;
  }

  function getOffers({ origin = null } = {}) {
    // return the offers sorted by id
    return idToOffer
      .entries()
      .filter(
        ([_id, offer]) =>
          origin === null ||
          (offer.requestContext && offer.requestContext.dappOrigin === origin),
      )
      .sort(([id1], [id2]) => id1 > id2)
      .map(([_id, offer]) => harden(offer));
  }

  const compileProposal = proposalTemplate => {
    const {
      want = {},
      give = {},
      exit = { onDemand: null },
    } = proposalTemplate;

    const purseKeywordRecord = {};

    const compile = amountKeywordRecord => {
      return Object.fromEntries(
        Object.entries(amountKeywordRecord).map(
          ([keyword, { pursePetname, value }]) => {
            const purse = getPurse(pursePetname);
            purseKeywordRecord[keyword] = purse;
            const brand = purseToBrand.get(purse);
            const amount = { brand, value };
            return [keyword, amount];
          },
        ),
      );
    };

    const proposal = {
      want: compile(want),
      give: compile(give),
      exit,
    };

    return { proposal, purseKeywordRecord };
  };

  const compileOffer = async offer => {
    const { inviteHandleBoardId } = offer;
    const { proposal, purseKeywordRecord } = compileProposal(
      offer.proposalTemplate,
    );

    // Find invite in wallet and withdraw
    const { value: inviteValueElems } = await E(
      zoeInvitePurse,
    ).getCurrentAmount();
    const inviteHandle = await E(board).getValue(inviteHandleBoardId);
    const matchInvite = element => element.handle === inviteHandle;
    const inviteBrand = purseToBrand.get(zoeInvitePurse);
    const { amountMath: inviteAmountMath } = brandTable.get(inviteBrand);
    const matchingInvite = inviteValueElems.find(matchInvite);
    assert(
      matchingInvite,
      details`Cannot find invite corresponding to ${q(inviteHandleBoardId)}`,
    );
    const inviteAmount = inviteAmountMath.make(
      harden([inviteValueElems.find(matchInvite)]),
    );
    const inviteP = E(zoeInvitePurse).withdraw(inviteAmount);

    return { proposal, inviteP, purseKeywordRecord };
  };

  const dappOrigins = makeStore('dappOrigin');
  const { notifier: dappNotifier, updater: dappUpdater } = makeNotifierKit([]);

  function updateDapp(dappRecord) {
    harden(dappRecord);
    dappOrigins.set(dappRecord.origin, dappRecord);
    dappUpdater.updateState([...dappOrigins.values()]);
  }

  async function waitForDappApproval(suggestedPetname, origin) {
    let dappRecord;
    if (dappOrigins.has(origin)) {
      dappRecord = dappOrigins.get(origin);
    } else {
      let resolve;
      let reject;
      let approvalP;
      dappRecord = {
        suggestedPetname,
        petname: suggestedPetname,
        origin,
      };

      dappRecord.actions = {
        setPetname(petname) {
          if (dappRecord.petname === petname) {
            return dappRecord.actions;
          }
          if (edgeMapping.valToPetname.has(origin)) {
            edgeMapping.renamePetname(petname, origin);
          } else {
            edgeMapping.suggestPetname(petname, origin);
          }
          dappRecord = {
            ...dappRecord,
            petname,
          };
          updateDapp(dappRecord);
          updateAllState();
          return dappRecord.actions;
        },
        enable() {
          // Enable the dapp with the attached petname.
          dappRecord = {
            ...dappRecord,
            enable: true,
          };
          edgeMapping.suggestPetname(dappRecord.petname, origin);
          updateDapp(dappRecord);

          // Allow the pending requests to pass.
          resolve();
          return dappRecord.actions;
        },
        disable(reason = undefined) {
          // Reject the pending dapp requests.
          if (reject) {
            reject(reason);
          }
          // Create a new, suspended-approval record.
          ({ resolve, reject, promise: approvalP } = producePromise());
          dappRecord = {
            ...dappRecord,
            enable: false,
            approvalP,
          };
          updateDapp(dappRecord);
          return dappRecord.actions;
        },
      };

      // Prepare the table entry to be updated.
      dappOrigins.init(origin, {});

      // Initially disable it.
      dappRecord.actions.disable();
    }

    await dappRecord.approvalP;
    // AWAIT
    // Refetch the origin record.
    return dappOrigins.get(origin);
  }

  async function addOffer(rawOffer, requestContext = {}) {
    const dappOrigin =
      requestContext.dappOrigin || requestContext.origin || 'unknown';
    const {
      id: rawId,
      instanceHandleBoardId,
      installationHandleBoardId,
    } = rawOffer;
    const id = `${dappOrigin}#${rawId}`;
    assert(
      typeof instanceHandleBoardId === 'string',
      details`instanceHandleBoardId must be a string`,
    );
    assert(
      typeof installationHandleBoardId === 'string',
      details`installationHandleBoardId must be a string`,
    );
    const offer = harden({
      ...rawOffer,
      id,
      requestContext: { ...requestContext, dappOrigin },
      status: undefined,
    });
    idToOffer.init(id, offer);
    updateInboxState(id, offer);

    // Compile the offer
    idToCompiledOfferP.set(id, await compileOffer(offer));

    // Our inbox state may have an enriched offer.
    updateInboxState(id, idToOffer.get(id));
    return id;
  }

  function consummated(offer) {
    return offer.status !== undefined;
  }

  function declineOffer(id) {
    const offer = idToOffer.get(id);
    if (consummated(offer)) {
      return;
    }
    // Update status, drop the proposal
    const declinedOffer = {
      ...offer,
      status: 'decline',
    };
    idToOffer.set(id, declinedOffer);
    updateInboxState(id, declinedOffer);
  }

  async function cancelOffer(id) {
    const completeFn = idToComplete.get(id);
    if (!completeFn) {
      return false;
    }

    completeFn()
      .then(_ => {
        idToComplete.delete(id);
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
    const offer = idToOffer.get(id);
    if (consummated(offer)) {
      return undefined;
    }

    let ret = {};
    let alreadyResolved = false;
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
        depositedP,
        completeObj,
        outcome,
        offerHandle,
      } = await executeOffer(compiledOffer);

      idToComplete.set(id, () => {
        alreadyResolved = true;
        return E(completeObj).complete();
      });
      idToOfferHandle.set(id, offerHandle);
      // The offer might have been postponed, or it might have been immediately
      // consummated. Only subscribe if it was postponed.
      E(zoe)
        .isOfferActive(offerHandle)
        .then(active => {
          if (active) {
            subscribeToNotifier(id, offerHandle);
          }
        });

      // The outcome is most often a string that can be returned, but
      // it could be an object. We don't do anything currently if it
      // is an object, but we will store it here for future use.
      idToOutcome.set(id, outcome);

      ret = { outcome, depositedP };

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
    return brandMapping.petnameToVal.entries().map(([petname, brand]) => {
      const { issuer } = brandTable.get(brand);
      return [petname, issuer];
    });
  }

  const payments = makeStore('payment');
  const {
    updater: paymentsUpdater,
    notifier: paymentsNotifier,
  } = makeNotifierKit();
  const updatePaymentRecord = ({ actions, ...preDisplay }) => {
    const displayPayment = fillInSlots(dehydrate(harden(preDisplay)));
    const paymentRecord = { ...preDisplay, actions, displayPayment };
    payments.set(paymentRecord.payment, harden(paymentRecord));
    paymentsUpdater.updateState([...payments.values()]);
  };

  const addPayment = async (payment, depositTo = undefined) => {
    /**
     * @typedef {Object} PaymentRecord
     * @property {Issuer} issuer
     * @property {Payment} payment
     * @property {Brand} brand
     * @property {'pending'|'deposited'} status
     * @property {typeof actions} actions
     */

    // We don't even create the record until we get an alleged brand.
    const brand = await E(payment).getAllegedBrand();

    /** @type {Partial<PaymentRecord>} */
    let paymentRecord = {
      payment,
      brand,
      issuer: undefined,
      status: undefined,
    };

    const depositedPK = producePromise();
    const actions = {
      async deposit(pursePetname = undefined) {
        let purse;
        if (pursePetname === undefined) {
          if (!brandToAutoDepositPurse.has(brand)) {
            // No automatic purse right now.
            return depositedPK.promise;
          }
          // Plop into the current autodeposit purse.
          purse = brandToAutoDepositPurse.get(brand);
        } else {
          purse = purseMapping.petnameToVal.get(pursePetname);
        }
        paymentRecord = {
          ...paymentRecord,
          status: 'pending',
        };
        updatePaymentRecord(paymentRecord);
        // Now try depositing.
        const depositedAmount = await E(purse).deposit(payment);
        paymentRecord = {
          ...paymentRecord,
          status: 'deposited',
          depositedAmount,
        };
        updatePaymentRecord(paymentRecord);
        depositedPK.resolve(depositedAmount);
        return depositedPK.promise;
      },
      async refresh() {
        if (!brandTable.has(brand)) {
          return false;
        }

        const { issuer } = paymentRecord;
        if (!issuer) {
          paymentRecord = {
            ...paymentRecord,
            ...brandTable.get(brand),
          };
          updatePaymentRecord(paymentRecord);
        }

        return actions.getAmountOf();
      },
      async getAmountOf() {
        const { issuer } = paymentRecord;

        // Fetch the current amount of the payment.
        const lastAmount = await E(issuer).getAmountOf(payment);

        paymentRecord = {
          ...paymentRecord,
          lastAmount,
        };
        updatePaymentRecord(paymentRecord);
        return true;
      },
    };

    paymentRecord.actions = actions;
    payments.init(payment, harden(paymentRecord));
    const refreshed = await actions.refresh();
    if (!refreshed) {
      // Only update if the refresh didn't.
      updatePaymentRecord(paymentRecord);
    }

    // Try an automatic deposit.
    return actions.deposit(depositTo);
  };

  // Allow people to send us payments.
  const selfContact = await addContact('Self', {
    receive(payment) {
      return addPayment(payment);
    },
  });

  function getDepositFacetId(brandBoardId) {
    return E(board)
      .getValue(brandBoardId)
      .then(brand => {
        const depositFacetBoardId = brandToDepositFacetId.get(brand);
        return depositFacetBoardId;
      });
  }

  async function disableAutoDeposit(pursePetname) {
    const purse = purseMapping.petnameToVal.get(pursePetname);
    const brand = purseToBrand.get(purse);
    if (
      !brandToAutoDepositPurse.has(brand) ||
      brandToAutoDepositPurse.get(brand) !== purse
    ) {
      return;
    }

    brandToAutoDepositPurse.delete(brand);
    await updateAllPurseState();
  }

  const pendingEnableAutoDeposits = makeStore('brand');
  async function enableAutoDeposit(pursePetname) {
    const purse = purseMapping.petnameToVal.get(pursePetname);
    const brand = purseToBrand.get(purse);
    if (brandToAutoDepositPurse.has(brand)) {
      brandToAutoDepositPurse.set(brand, purse);
    } else {
      brandToAutoDepositPurse.init(brand, purse);
    }
    await updateAllPurseState();

    const pendingP =
      pendingEnableAutoDeposits.has(brand) &&
      pendingEnableAutoDeposits.get(brand);
    if (pendingP) {
      return pendingP;
    }

    const pr = producePromise();
    pendingEnableAutoDeposits.init(brand, pr.promise);

    const boardId = selfContact.depositBoardId;
    brandToDepositFacetId.init(brand, boardId);

    pr.resolve(boardId);
    await updateAllPurseState();
    return pr.promise;
  }

  /**
   * @param {(petname: string | string[], value: any) => void} acceptFn
   * @param {string | string[]} suggestedPetname
   * @param {string} boardId
   * @param {string} [dappOrigin]
   */
  function acceptPetname(
    acceptFn,
    suggestedPetname,
    boardId,
    dappOrigin = undefined,
  ) {
    let petname;
    if (dappOrigin === undefined) {
      petname = suggestedPetname;
    } else {
      const edgename = edgeMapping.valToPetname.get(dappOrigin);
      petname = [edgename, suggestedPetname];
    }

    return E(board)
      .getValue(boardId)
      .then(value => acceptFn(petname, value));
  }

  async function suggestIssuer(
    suggestedPetname,
    issuerBoardId,
    dappOrigin = undefined,
  ) {
    // TODO: add an approval step in the wallet UI in which
    // suggestion can be rejected and the suggested petname can be
    // changed
    return acceptPetname(
      // Make a purse if we add the issuer.
      (petname, value) => addIssuer(petname, value, true),
      suggestedPetname,
      issuerBoardId,
      dappOrigin,
    );
  }

  async function suggestInstance(
    suggestedPetname,
    instanceHandleBoardId,
    dappOrigin = undefined,
  ) {
    // TODO: add an approval step in the wallet UI in which
    // suggestion can be rejected and the suggested petname can be
    // changed

    return acceptPetname(
      addInstance,
      suggestedPetname,
      instanceHandleBoardId,
      dappOrigin,
    );
  }

  async function suggestInstallation(
    suggestedPetname,
    installationHandleBoardId,
    dappOrigin = undefined,
  ) {
    // TODO: add an approval step in the wallet UI in which
    // suggestion can be rejected and the suggested petname can be
    // changed

    return acceptPetname(
      addInstallation,
      suggestedPetname,
      installationHandleBoardId,
      dappOrigin,
    );
  }

  function renameIssuer(petname, issuer) {
    assert(
      brandTable.hasIssuer(issuer),
      `issuer has not been previously added`,
    );
    const brand = brandTable.getBrandForIssuer(issuer);
    brandMapping.renamePetname(petname, brand);
    // We don't wait for the update before returning.
    updateAllState();
    return `issuer ${q(petname)} successfully renamed in wallet`;
  }

  function renameInstance(petname, instance) {
    instanceMapping.renamePetname(petname, instance);
    // We don't wait for the update before returning.
    updateAllState();
    return `instance ${q(petname)} successfully renamed in wallet`;
  }

  function renameInstallation(petname, installation) {
    installationMapping.renamePetname(petname, installation);
    // We don't wait for the update before returning.
    updateAllState();
    return `installation ${q(petname)} successfully renamed in wallet`;
  }

  function getIssuer(petname) {
    const brand = brandMapping.petnameToVal.get(petname);
    return brandTable.get(brand).issuer;
  }

  function getSelfContact() {
    return selfContact;
  }

  function getInstance(petname) {
    return instanceMapping.petnameToVal.get(petname);
  }

  function getInstallation(petname) {
    return installationMapping.petnameToVal.get(petname);
  }

  const wallet = harden({
    waitForDappApproval,
    getDappNotifier() {
      return dappNotifier;
    },
    getPursesNotifier() {
      return pursesNotifier;
    },
    addIssuer,
    addInstance,
    addInstallation,
    renameIssuer,
    renameInstance,
    renameInstallation,
    getSelfContact,
    getInstance,
    getInstallation,
    makeEmptyPurse,
    deposit,
    getIssuer,
    getIssuers,
    getPurses,
    getPurse,
    getPurseIssuer,
    addOffer,
    declineOffer,
    cancelOffer,
    acceptOffer,
    getOffers,
    getOfferHandle: id => idToOfferHandle.get(id),
    getOfferHandles: ids => ids.map(wallet.getOfferHandle),
    enableAutoDeposit,
    disableAutoDeposit,
    getDepositFacetId,
    suggestIssuer,
    suggestInstance,
    suggestInstallation,
    addContact,
    getContactsNotifier() {
      return contactsNotifier;
    },
    addPayment,
    getPaymentsNotifier() {
      return paymentsNotifier;
    },
  });

  // Make Zoe invite purse
  const ZOE_INVITE_BRAND_PETNAME = 'zoe invite';
  const ZOE_INVITE_PURSE_PETNAME = 'Default Zoe invite purse';
  const inviteIssuerP = E(zoe).getInviteIssuer();
  const addZoeIssuer = issuerP =>
    wallet.addIssuer(ZOE_INVITE_BRAND_PETNAME, issuerP);
  const makeInvitePurse = () =>
    wallet.makeEmptyPurse(ZOE_INVITE_BRAND_PETNAME, ZOE_INVITE_PURSE_PETNAME);
  const addInviteDepositFacet = () =>
    E(wallet).enableAutoDeposit(ZOE_INVITE_PURSE_PETNAME);

  await addZoeIssuer(inviteIssuerP)
    .then(makeInvitePurse)
    .then(addInviteDepositFacet);
  zoeInvitePurse = wallet.getPurse(ZOE_INVITE_PURSE_PETNAME);

  return wallet;
}
