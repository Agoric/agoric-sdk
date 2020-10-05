// @ts-check

import { assert, details, q } from '@agoric/assert';
import { makeStore, makeWeakStore } from '@agoric/store';
import { makeIssuerTable } from '@agoric/zoe/src/issuerTable';

import { E } from '@agoric/eventual-send';

import { makeMarshal } from '@agoric/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';

import makeObservablePurse from './observable';
import { makeDehydrator } from './lib-dehydrate';

import '@agoric/store/exported';
import '@agoric/zoe/exported';
import './types';

// does nothing
const noActionStateChangeHandler = _newState => {};

const cmp = (a, b) => {
  if (a > b) {
    return 1;
  }
  if (a === b) {
    return 0;
  }
  return -1;
};

/**
 * @typedef {Object} MakeWalletParams
 * @property {ZoeService} zoe
 * @property {Board} board
 * @property {(state: any) => void} [pursesStateChangeHandler=noActionStateChangeHandler]
 * @property {(state: any) => void} [inboxStateChangeHandler=noActionStateChangeHandler]
 * @param {MakeWalletParams} param0
 */
export async function makeWallet({
  zoe,
  board,
  pursesStateChangeHandler = noActionStateChangeHandler,
  inboxStateChangeHandler = noActionStateChangeHandler,
}) {
  // Create the petname maps so we can dehydrate information sent to
  // the frontend.
  const { makeMapping, dehydrate, edgeMapping } = makeDehydrator();
  /** @type {Mapping<Purse>} */
  const purseMapping = makeMapping('purse');
  /** @type {Mapping<Brand>} */
  const brandMapping = makeMapping('brand');
  /** @type {Mapping<Contact>} */
  const contactMapping = makeMapping('contact');
  /** @type {Mapping<Instance>} */
  const instanceMapping = makeMapping('instance');
  /** @type {Mapping<Installation>} */
  const installationMapping = makeMapping('installation');

  const brandTable = makeIssuerTable();
  /** @type {WeakStore<Issuer, string>} */
  const issuerToBoardId = makeWeakStore('issuer');

  /** @type {WeakStore<Purse, Brand>} */
  const purseToBrand = makeWeakStore('purse');
  /** @type {Store<Brand, string>} */
  const brandToDepositFacetId = makeStore('brand');
  /** @type {Store<Brand, Purse>} */
  const brandToAutoDepositPurse = makeStore('brand');

  // Offers that the wallet knows about (the inbox).
  const idToOffer = makeStore('offerId');
  const idToNotifierP = makeStore('offerId');

  // Compiled offers (all ready to execute).
  const idToCompiledOfferP = new Map();
  const idToComplete = new Map();
  const idToSeat = new Map();

  // Client-side representation of the purses inbox;
  /** @type {Map<string, PursesJSONState>} */
  const pursesState = new Map();

  /** @type {Map<Purse, PursesFullState>} */
  const pursesFullState = new Map();
  const inboxState = new Map();

  const idToInvitationPK = makeStore('offerId');
  const ensureInvitationPK = id => {
    if (idToInvitationPK.has(id)) {
      return idToInvitationPK.get(id);
    }
    const invitationPK = makePromiseKit();
    idToInvitationPK.init(id, invitationPK);
    return invitationPK;
  };

  /**
   * The default Zoe invite purse is used to make an offer.
   *
   * @type {Purse}
   */
  let zoeInvitePurse;

  function getSortedValues(map) {
    const entries = [...map.entries()];
    // Sort for determinism.
    const values = entries
      .sort(([id1], [id2]) => cmp(id1, id2))
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
  const identitySlotToValFn = (slot, _) => slot;

  // Instead of { body, slots }, fill the slots. This is useful for
  // display but not for data processing, since the special identifier
  // @qclass is lost.
  const { unserialize: fillInSlots } = makeMarshal(noOp, identitySlotToValFn);

  const {
    notifier: pursesNotifier,
    updater: pursesUpdater,
  } = /** @type {NotifierRecord<PursesFullState[]>} */ (makeNotifierKit([]));

  /**
   * @param {Petname} pursePetname
   * @param {Purse} purse
   */
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
    /**
     * @type {PursesJSONState}
     */
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
            const { amountMath } = brandTable.getByBrand(brand);
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
          async receive(paymentP) {
            const payment = await paymentP;
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

  async function updateInboxState(id, offer, doPush = true) {
    // Only sent the uncompiled offer to the client.
    const { proposalTemplate } = offer;
    const { instance, installation } = idToOffer.get(id);
    if (!instance || !installation) {
      // We haven't yet deciphered the invitation, so don't send
      // this offer.
      return;
    }
    const instanceDisplay = display(instance);
    const installationDisplay = display(installation);
    const alreadyDisplayed =
      inboxState.has(id) && inboxState.get(id).proposalForDisplay;

    const offerForDisplay = {
      ...offer,
      // We cannot store the actions, installation, and instance in the
      // displayed offer objects because they are presences are presences and we
      // don't wish to send presences to the frontend.
      actions: undefined,
      installation: undefined,
      instance: undefined,
      proposalTemplate,
      instancePetname: instanceDisplay.petname,
      installationPetname: installationDisplay.petname,
      proposalForDisplay: displayProposal(alreadyDisplayed || proposalTemplate),
    };

    inboxState.set(id, offerForDisplay);
    if (doPush) {
      // Only trigger a state change if this was a single update.
      inboxStateChangeHandler(getInboxState());
    }
  }

  async function updateAllInboxState() {
    await Promise.all(
      Array.from(inboxState.entries()).map(([id, offer]) =>
        // Don't trigger state changes.
        updateInboxState(id, offer, false),
      ),
    );
    // Now batch together all the state changes.
    inboxStateChangeHandler(getInboxState());
  }

  const {
    updater: issuersUpdater,
    notifier: issuersNotifier,
  } = /** @type {NotifierRecord<Array<[Petname, BrandRecord]>>} */ (makeNotifierKit(
    [],
  ));

  function updateAllIssuersState() {
    issuersUpdater.updateState(
      [...brandMapping.petnameToVal.entries()].map(([petname, brand]) => {
        const issuerRecord = brandTable.getByBrand(brand);
        return [
          petname,
          {
            ...issuerRecord,
            issuerBoardId: issuerToBoardId.get(issuerRecord.issuer),
          },
        ];
      }),
    );
  }

  // TODO: fix this horribly inefficient update on every potential
  // petname change.
  async function updateAllState() {
    updateAllIssuersState();
    await updateAllPurseState();
    await updateAllInboxState();
  }

  // handle the update, which has already resolved to a record. If the offer is
  // 'done', mark the offer 'complete', otherwise resubscribe to the notifier.
  function updateOrResubscribe(id, seat, update) {
    const { updateCount } = update;
    if (updateCount === undefined) {
      // TODO do we still need these?
      idToSeat.delete(id);

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
        .then(nextUpdate => updateOrResubscribe(id, seat, nextUpdate));
    }
  }

  /**
   * There's a new offer. Ask Zoe to notify us when the offer is complete.
   *
   * @param {string} id
   * @param {ERef<UserSeat>} seat
   */
  async function subscribeToNotifier(id, seat) {
    E(seat)
      .getNotifier()
      .then(offerNotifierP => {
        if (!idToNotifierP.has(id)) {
          idToNotifierP.init(id, offerNotifierP);
        }
        E(offerNotifierP)
          .getUpdateSince()
          .then(update => updateOrResubscribe(id, seat, update));
      });
  }

  async function executeOffer(compiledOfferP) {
    // =====================
    // === AWAITING TURN ===
    // =====================

    const { inviteP, purseKeywordRecord, proposal } = await compiledOfferP;

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

    // this await is purely to prevent "embarrassment" of
    // revealing to zoe that we had insufficient funds/assets
    // for the offer.
    const payments = await Promise.all(paymentPs);

    const paymentKeywordRecord = Object.fromEntries(
      keywords.map((keyword, i) => [keyword, payments[i]]),
    );

    const seat = E(zoe).offer(
      inviteP,
      harden(proposal),
      harden(paymentKeywordRecord),
    );

    // We'll resolve when deposited.
    const depositedP = E(seat)
      .getPayouts()
      .then(payoutObj => {
        const payoutIndexToKeyword = [];
        return Promise.all(
          Object.entries(payoutObj)
            .map(([keyword, payoutP], i) => {
              payoutIndexToKeyword[i] = keyword;
              return payoutP;
            })
            .map((payoutP, payoutIndex) => {
              const keyword = payoutIndexToKeyword[payoutIndex];
              const purse = purseKeywordRecord[keyword];
              if (purse && payoutP) {
                // eslint-disable-next-line no-use-before-define
                return addPayment(payoutP, purse);
              }
              return undefined;
            }),
        );
      });

    return { depositedP, seat };
  }

  // === API

  const addIssuer = async (petnameForBrand, issuerP, makePurse = false) => {
    const { brand, issuer } = await brandTable.initIssuer(issuerP);
    if (!issuerToBoardId.has(issuer)) {
      const issuerBoardId = await E(board).getId(issuer);
      issuerToBoardId.init(issuer, issuerBoardId);
    }
    const addBrandPetname = () => {
      let p;
      const already = brandMapping.valToPetname.has(brand);
      petnameForBrand = brandMapping.suggestPetname(petnameForBrand, brand);
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
    return addBrandPetname().then(updateAllIssuersState);
  };

  const publishIssuer = async brand => {
    const { issuer } = brandTable.getByBrand(brand);
    if (issuerToBoardId.has(issuer)) {
      return issuerToBoardId.get(issuer);
    }
    const issuerBoardId = await E(board).getId(issuer);
    issuerToBoardId.init(issuer, issuerBoardId);
    updateAllIssuersState();
    return issuerBoardId;
  };

  const {
    updater: contactsUpdater,
    notifier: contactsNotifier,
  } = /** @type {NotifierRecord<Array<[Petname, Contact]>>} */ (makeNotifierKit(
    [],
  ));

  const addContact = async (petname, actions) => {
    const already = await E(board).has(actions);
    let depositFacet;
    if (already) {
      depositFacet = actions;
    } else {
      depositFacet = harden({
        receive(paymentP) {
          return E(actions).receive(paymentP);
        },
      });
    }
    const depositBoardId = await E(board).getId(depositFacet);
    const found = [...contactMapping.petnameToVal.entries()].find(
      ([_pn, { depositBoardId: dbid }]) => depositBoardId === dbid,
    );

    assert(
      !found,
      details`${q(found && found[0])} is already the petname for board ID ${q(
        depositBoardId,
      )}`,
    );

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
    petname = instanceMapping.suggestPetname(petname, instanceHandle);
    // We don't wait for the update before returning.
    updateAllState();
    return `instance ${q(petname)} successfully added to wallet`;
  };

  const addInstallation = (petname, installationHandle) => {
    // We currently just add the petname mapped to the installationHandle
    // value, but we could have a list of known installations for
    // possible display in the wallet.
    petname = installationMapping.suggestPetname(petname, installationHandle);
    // We don't wait for the update before returning.
    updateAllState();
    return `installation ${q(petname)} successfully added to wallet`;
  };

  const makeEmptyPurse = async (brandPetname, petnameForPurse) => {
    const brand = brandMapping.petnameToVal.get(brandPetname);
    const { issuer } = brandTable.getByBrand(brand);

    // IMPORTANT: once wrapped, the original purse should never
    // be used otherwise the UI state will be out of sync.
    const doNotUse = await E(issuer).makeEmptyPurse();

    const purse = makeObservablePurse(E, doNotUse, () =>
      updatePursesState(purseMapping.valToPetname.get(purse), purse),
    );

    purseToBrand.init(purse, brand);
    petnameForPurse = purseMapping.suggestPetname(petnameForPurse, purse);
    updatePursesState(petnameForPurse, purse);
  };

  async function deposit(pursePetname, payment) {
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
    const { issuer } = brandTable.getByBrand(brand);
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
      .sort(([id1], [id2]) => cmp(id1, id2))
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
    const {
      inviteHandleBoardId, // Keep for backward-compatibility.
      invitationHandleBoardId = inviteHandleBoardId,
    } = offer;

    const { proposal, purseKeywordRecord } = compileProposal(
      offer.proposalTemplate,
    );

    const invitationPK = ensureInvitationPK(offer.id);
    const inviteP = invitationPK.promise;
    if (invitationHandleBoardId) {
      // Legacy: the offer does not contain the invitation.
      assert.typeof(
        invitationHandleBoardId,
        'string',
        details`invitationHandleBoardId must be a string`,
      );

      // Find invite in wallet and withdraw
      const { value: inviteValueElems } = await E(
        zoeInvitePurse,
      ).getCurrentAmount();
      const inviteHandle = await E(board).getValue(invitationHandleBoardId);
      const matchInvite = element => element.handle === inviteHandle;
      const inviteBrand = purseToBrand.get(zoeInvitePurse);
      const { amountMath: inviteAmountMath } = brandTable.getByBrand(
        inviteBrand,
      );
      const matchingInvite = inviteValueElems.find(matchInvite);
      assert(
        matchingInvite,
        details`Cannot find invite corresponding to ${q(
          invitationHandleBoardId,
        )}`,
      );
      const inviteAmount = inviteAmountMath.make(
        harden([inviteValueElems.find(matchInvite)]),
      );
      invitationPK.resolve(E(zoeInvitePurse).withdraw(inviteAmount));
    }

    // Find the details for the invitation.
    const { installation, instance } = await E(zoe).getInvitationDetails(
      inviteP,
    );
    idToInvitationPK.delete(offer.id);

    return {
      proposal,
      inviteP,
      purseKeywordRecord,
      installation,
      instance,
    };
  };

  /** @type {Store<string, DappRecord>} */
  const dappOrigins = makeStore('dappOrigin');
  const {
    notifier: dappsNotifier,
    updater: dappsUpdater,
  } = /** @type {NotifierRecord<DappRecord[]>} */ (makeNotifierKit([]));

  function updateDapp(dappRecord) {
    harden(dappRecord);
    dappOrigins.set(dappRecord.origin, dappRecord);
    dappsUpdater.updateState([...dappOrigins.values()]);
  }

  async function waitForDappApproval(
    suggestedPetname,
    origin,
    notYetEnabled = () => {},
  ) {
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
        approvalP,
        enable: false,
        actions: {
          setPetname(petname) {
            if (dappRecord.petname === petname) {
              return dappRecord.actions;
            }
            if (edgeMapping.valToPetname.has(origin)) {
              edgeMapping.renamePetname(petname, origin);
            } else {
              petname = edgeMapping.suggestPetname(petname, origin);
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
            ({ resolve, reject, promise: approvalP } = makePromiseKit());
            dappRecord = {
              ...dappRecord,
              enable: false,
              approvalP,
            };
            updateDapp(dappRecord);
            return dappRecord.actions;
          },
        },
      };

      // Prepare the table entry to be updated.
      dappOrigins.init(origin, dappRecord);

      // Initially disable it.
      dappRecord.actions.disable();
    }

    if (!dappRecord.enable) {
      notYetEnabled();
    }
    await dappRecord.approvalP;
    // AWAIT
    // Refetch the origin record.
    return dappOrigins.get(origin);
  }

  async function addOfferInvitation(offer, inviteP, requestContext = {}) {
    const dappOrigin = requestContext.dappOrigin || requestContext.origin;
    const { id } = offer;
    if (dappOrigin !== undefined) {
      assert(
        id.startsWith(`${dappOrigin}#`),
        details`Offer id ${id} is not from ${dappOrigin}`,
      );
    }
    const invitationPK = ensureInvitationPK(id);
    invitationPK.resolve(inviteP);
    await inviteP;
  }

  async function addOffer(rawOffer, requestContext = {}) {
    const dappOrigin =
      requestContext.dappOrigin || requestContext.origin || 'unknown';
    const { id: rawId } = rawOffer;
    const id = `${dappOrigin}#${rawId}`;
    const offer = harden({
      ...rawOffer,
      id,
      requestContext: { ...requestContext, dappOrigin },
      status: undefined,
    });
    idToOffer.init(id, offer);
    await updateInboxState(id, offer);

    // Compile the offer
    const compiledOfferP = compileOffer(offer);
    idToCompiledOfferP.set(id, compiledOfferP);

    // Our inbox state may have an enriched offer.
    await updateInboxState(id, idToOffer.get(id));
    const invitedP = compiledOfferP.then(async ({ installation, instance }) => {
      if (!idToOffer.has(id)) {
        return id;
      }
      idToOffer.set(
        id,
        harden({
          ...idToOffer.get(id),
          installation,
          instance,
        }),
      );
      // Update the inbox any time later.
      await updateInboxState(id, idToOffer.get(id));
      return id;
    });
    return { offer, invitedP };
  }

  function consummated(offer) {
    if (offer.status !== undefined) {
      return true;
    }
    if (offer.actions) {
      E(offer.actions).handled(offer);
    }
    return false;
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

    /** @type {{ outcome?: any, depositedP?: Promise<any[]>, dappContext?: any }} */
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

      const { depositedP, seat } = await executeOffer(compiledOffer);

      idToComplete.set(id, () => {
        alreadyResolved = true;
        return E(seat).tryExit();
      });
      idToSeat.set(id, seat);
      // The offer might have been postponed, or it might have been immediately
      // consummated. Only subscribe if it was postponed.
      E(seat)
        .hasExited()
        .then(exited => {
          if (!exited) {
            subscribeToNotifier(id, seat);
          }
        });

      // The outcome is most often a string that can be returned, but
      // it could be an object. We don't do anything currently if it
      // is an object, but we will store it here for future use.
      const outcome = await E(seat).getOfferResult();
      if (offer.actions) {
        E(offer.actions).result(offer, outcome);
      }

      ret = {
        outcome,
        depositedP,
        dappContext: offer.dappContext,
      };

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
      if (offer.actions) {
        E(offer.actions).error(offer, e);
      }
      rejected(e);
      throw e;
    }
    return ret;
  }

  /** @returns {[Petname, Issuer][]} */
  function getIssuers() {
    return brandMapping.petnameToVal.entries().map(([petname, brand]) => {
      const { issuer } = brandTable.getByBrand(brand);
      return [petname, issuer];
    });
  }

  /** @type {Store<Payment, PaymentRecord>} */
  const payments = makeStore('payment');
  const {
    updater: paymentsUpdater,
    notifier: paymentsNotifier,
  } = /** @type {NotifierRecord<PaymentRecord[]>} */ (makeNotifierKit([]));
  /**
   * @param {PaymentRecord} param0
   */
  const updatePaymentRecord = ({ actions, ...preDisplay }) => {
    const displayPayment = fillInSlots(dehydrate(harden(preDisplay)));
    const paymentRecord = { ...preDisplay, actions, displayPayment };
    payments.set(paymentRecord.payment, harden(paymentRecord));
    paymentsUpdater.updateState([...payments.values()]);
  };

  /**
   * @param {ERef<Payment>} paymentP
   * @param {Purse | Petname=} depositTo
   */
  const addPayment = async (paymentP, depositTo = undefined) => {
    // We don't even create the record until we resolve the payment.
    const payment = await paymentP;
    const brand = await E(payment).getAllegedBrand();
    const depositedPK = makePromiseKit();

    /** @type {PaymentRecord} */
    let paymentRecord = {
      payment,
      brand,
      issuer: undefined,
      status: undefined,
      actions: {
        async deposit(purseOrPetname = undefined) {
          /** @type {Purse} */
          let purse;
          if (purseOrPetname === undefined) {
            if (!brandToAutoDepositPurse.has(brand)) {
              // No automatic purse right now.
              return depositedPK.promise;
            }
            // Plop into the current autodeposit purse.
            purse = brandToAutoDepositPurse.get(brand);
          } else if (
            Array.isArray(purseOrPetname) ||
            typeof purseOrPetname === 'string'
          ) {
            purse = purseMapping.petnameToVal.get(purseOrPetname);
          } else {
            purse = purseOrPetname;
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
          if (!brandTable.hasByBrand(brand)) {
            return false;
          }

          const { issuer } = paymentRecord;
          if (!issuer) {
            const brandRecord = brandTable.getByBrand(brand);
            paymentRecord = {
              ...paymentRecord,
              ...brandRecord,
              issuerBoardId: issuerToBoardId.get(brandRecord.issuer),
            };
            updatePaymentRecord(paymentRecord);
          }

          return paymentRecord.actions.getAmountOf();
        },
        async getAmountOf() {
          const { issuer } = paymentRecord;
          assert(issuer);

          // Fetch the current amount of the payment.
          const lastAmount = await E(issuer).getAmountOf(payment);

          paymentRecord = {
            ...paymentRecord,
            lastAmount,
          };
          updatePaymentRecord(paymentRecord);
          return true;
        },
      },
    };

    payments.init(payment, harden(paymentRecord));
    const refreshed = await paymentRecord.actions.refresh();
    if (!refreshed) {
      // Only update if the refresh didn't.
      updatePaymentRecord(paymentRecord);
    }

    // Try an automatic deposit.
    return paymentRecord.actions.deposit(depositTo);
  };

  // Allow people to send us payments.
  const selfContact = await addContact('Self', {
    receive(payment) {
      return addPayment(payment);
    },
  });

  async function getDepositFacetId(_brandBoardId) {
    // Always return the generic deposit facet.
    return selfContact.depositBoardId;
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

    const pr = makePromiseKit();
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

  async function renameIssuer(petname, issuer) {
    assert(
      brandTable.hasByIssuer(issuer),
      `issuer has not been previously added`,
    );
    const brandRecord = brandTable.getByIssuer(issuer);
    brandMapping.renamePetname(petname, brandRecord.brand);
    await updateAllState();
    return `issuer ${q(petname)} successfully renamed in wallet`;
  }

  async function renameInstance(petname, instance) {
    instanceMapping.renamePetname(petname, instance);
    await updateAllState();
    return `instance ${q(petname)} successfully renamed in wallet`;
  }

  async function renameInstallation(petname, installation) {
    installationMapping.renamePetname(petname, installation);
    await updateAllState();
    return `installation ${q(petname)} successfully renamed in wallet`;
  }

  function getIssuer(petname) {
    const brand = brandMapping.petnameToVal.get(petname);
    return brandTable.getByBrand(brand).issuer;
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
    getDappsNotifier() {
      return dappsNotifier;
    },
    getPursesNotifier() {
      return pursesNotifier;
    },
    getIssuersNotifier() {
      return issuersNotifier;
    },
    addIssuer,
    publishIssuer,
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
    addOfferInvitation,
    declineOffer,
    cancelOffer,
    acceptOffer,
    getOffers,
    getSeat: id => idToSeat.get(id),
    getSeats: ids => ids.map(wallet.getSeat),
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
  const inviteIssuerP = E(zoe).getInvitationIssuer();
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
