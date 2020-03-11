import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import makeStore from '@agoric/store';
import makeWeakStore from '@agoric/weak-store';
import makeAmountMath from '@agoric/ertp/src/amountMath';

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
  const purseToIssuer = makeWeakStore();
  const issuerPetnameToIssuer = new Map();
  const issuerToIssuerNames = makeWeakStore();
  const issuerToBrand = makeWeakStore();
  const brandToIssuer = makeStore();
  const brandToMath = makeStore();

  // Proposals that the wallet knows about (the inbox).
  const idToProposal = new Map();

  // Compiled proposals (all ready to execute).
  const idToCompiledProposalP = new Map();
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
    const issuerNames = issuerToIssuerNames.get(brandToIssuer.get(brand));
    pursesState.set(pursePetname, {
      ...issuerNames,
      pursePetname,
      extent,
    });
    pursesStateChangeHandler(getPursesState());
  }

  async function updateInboxState(id, proposal) {
    // Only sent the uncompiled proposal to the client.
    inboxState.set(id, proposal);
    inboxStateChangeHandler(getInboxState());
  }

  async function makeOffer(compiledProposalP, inviteP) {
    const [invite, { zoeKind, purses, offerRules }] = await Promise.all([
      inviteP,
      compiledProposalP,
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
    issuerPetnameToIssuer.set(issuerPetname, issuer);
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
    return harden([...petnameToPurse.values()]);
  }

  function getOfferDescriptions() {
    // return the offers sorted by id
    return Array.from(idToProposal)
      .filter(p => p[1].status === 'accept')
      .sort((p1, p2) => p1[0] > p2[0])
      .map(([id, proposal]) => {
        const {
          offerRules: { payoutRules },
        } = proposal;
        return harden({ id, payoutRules });
      });
  }

  async function compileProposal(id, proposal) {
    const {
      instanceRegKey,
      contractIssuerIndexToRole = [], // FIXME: Only for compatibility with Zoe pre-Roles
      offerRulesTemplate,
    } = proposal;

    const roleIssuerNames = {};
    function createRoleOfferRulesAndPurses(tmpl) {
      const roleOfferRules = { exit: tmpl.exit };
      const rolePurses = {};

      const setPurseAmount = (roles, role, purse, extent = undefined) => {
        const issuer = purseToIssuer.get(purse);
        roleIssuerNames[role] = issuerToIssuerNames.get(issuer);
        const brand = issuerToBrand.get(issuer);
        let amount;
        if (extent === undefined) {
          amount = brandToMath.get(brand).getEmpty();
        } else {
          amount = { brand, extent };
        }
        roles[role] = amount;
      };

      if (offerRulesTemplate.want) {
        roleOfferRules.want = {};
      }
      Object.entries(offerRulesTemplate.want || {}).forEach(
        ([role, amount]) => {
          assert(
            amount.pursePetname,
            details`Want role ${role} has no pursePetname`,
          );
          const purse = petnameToPurse.get(amount.pursePetname);
          assert(
            purse,
            details`Want role ${role} pursePetname ${amount.pursePetname} is not a purse`,
          );
          rolePurses[role] = purse;
          setPurseAmount(roleOfferRules.want, role, purse, amount.extent);
        },
      );

      if (offerRulesTemplate.offer) {
        roleOfferRules.offer = {};
      }
      Object.entries(offerRulesTemplate.offer || {}).forEach(
        ([role, amount]) => {
          assert(
            amount.pursePetname,
            details`Offer role ${role} has no pursePetname`,
          );
          const purse = petnameToPurse.get(amount.pursePetname);
          assert(
            purse,
            details`Offer role ${role} pursePetname ${amount.pursePetname} is not a purse`,
          );
          rolePurses[role] = purse;
          setPurseAmount(roleOfferRules.offer, role, purse, amount.extent);
        },
      );

      return { roleOfferRules, rolePurses };
    }

    const { roleOfferRules, rolePurses } = createRoleOfferRulesAndPurses(
      offerRulesTemplate,
    );

    // Enrich the offerRulesTemplate.
    const newOfferRulesTemplate = { ...offerRulesTemplate };
    if (offerRulesTemplate.want) {
      const newRules = {};
      Object.entries(offerRulesTemplate.want || {}).forEach(
        ([role, amount]) => {
          newRules[role] = { ...amount, ...roleIssuerNames[role] };
        },
      );
      newOfferRulesTemplate.want = newRules;
    }

    if (offerRulesTemplate.offer) {
      const newRules = {};
      Object.entries(offerRulesTemplate.offer || {}).forEach(
        ([role, amount]) => {
          newRules[role] = { ...amount, ...roleIssuerNames[role] };
        },
      );
      newOfferRulesTemplate.offer = newRules;
    }

    // Resave the enriched proposal.
    idToProposal.set(id, {
      ...proposal,
      offerRulesTemplate: newOfferRulesTemplate,
    });

    // Get the instance.
    const instanceHandle = await E(registrar).get(instanceRegKey);
    const {
      publicAPI,
      roles: contractRoleIssuers,
      terms: { issuers: contractIssuers },
    } = await E(zoe).getInstance(instanceHandle);

    const roleIssuers = { ...contractRoleIssuers };
    Object.values(contractIssuerIndexToRole).forEach((role, i) => {
      roleIssuers[role] = contractIssuers[i];
    });

    async function finishCompile(offerRules, purses) {
      const roleBrands = {};
      let cachedRoleBrandsP;
      const getRoleBrandsP = () => {
        if (cachedRoleBrandsP) {
          return cachedRoleBrandsP;
        }
        cachedRoleBrandsP = Promise.all(
          Object.entries(roleIssuers).map(async ([role, issuer]) => {
            roleBrands[role] = await E(issuer).getBrand();
          }),
        );
        return cachedRoleBrandsP;
      };

      const replacePlaceholderRoles = async (roles, role) => {
        if (role[0] !== '$') {
          return;
        }

        // It's a placeholder role.  Find the first matching role with that brand.
        await getRoleBrandsP();
        const { brand } = roles[role];
        const roleEnt = Object.entries(roleBrands).find(
          ([_rname, rbrand]) => rbrand === brand,
        );
        assert(
          roleEnt,
          details`Placeholder role ${role} has no matching brand`,
        );
        roles[roleEnt[0]] = roles[role];
        delete roles[role];
        purses[roleEnt[0]] = purses[role];
        delete purses[role];
      };

      // Swap the placeholder roles for actual roles.
      await Promise.all([
        Promise.all(
          Object.keys(offerRules.want || {}).map(role =>
            replacePlaceholderRoles(offerRules.want, role),
          ),
        ),
        Promise.all(
          Object.keys(offerRules.offer || {}).map(role =>
            replacePlaceholderRoles(offerRules.offer, role),
          ),
        ),
      ]);

      if (contractIssuerIndexToRole.length === 0) {
        // We rely on Zoe Roles support.
        return { zoeKind: 'roles', offerRules, purses };
      }

      const indexedPurses = [];
      const indexedPayoutRules = await Promise.all(
        contractIssuerIndexToRole.map(async (role, i) => {
          indexedPurses[i] = purses[role];
          if (offerRules.want && offerRules.want[role]) {
            return { kind: 'wantAtLeast', amount: offerRules.want[role] };
          }
          if (offerRules.offer && offerRules.offer[role]) {
            return { kind: 'offerAtMost', amount: offerRules.offer[role] };
          }
          const amount = await E(
            E(contractIssuers[i]).getAmountMath(),
          ).getEmpty();
          return { kind: 'wantAtLeast', amount };
        }),
      );

      // Cheap translation of exitObj to exitRule.
      const exitObj = offerRules.exit || { onDemand: {} };
      const exitKind = Object.keys(exitObj)[0];
      const exitRule = {};
      Object.entries(exitObj[exitKind]).forEach(([key, val]) => {
        // Prevent functions from slipping in.
        if (typeof val !== 'function') {
          exitRule[key] = val;
        }
      });
      exitRule.kind = exitKind;

      return {
        zoeKind: 'indexed',
        offerRules: { payoutRules: indexedPayoutRules, exitRule },
        purses: indexedPurses,
      };
    }

    // Get the invite and the (possibly indexed) rules and purses.
    const { zoeKind, offerRules, purses } = await finishCompile(
      roleOfferRules,
      rolePurses,
    );
    return { zoeKind, publicAPI, offerRules, purses };
  }

  async function propose(rawProposal, requestContext) {
    const { id } = rawProposal;
    const proposal = {
      ...rawProposal,
      requestContext,
      status: undefined,
      wait: undefined,
    };
    idToProposal.set(id, proposal);
    updateInboxState(id, proposal);

    // Start compiling the template, saving a promise for it.
    idToCompiledProposalP.set(id, compileProposal(id, proposal));

    // Our inbox state may have an enriched proposal.
    updateInboxState(id, idToProposal.get(id));
  }

  function declineOffer(id) {
    const proposal = idToProposal.get(id);
    // Update status, drop the offerRules
    const declinedProposal = {
      ...proposal,
      status: 'decline',
      wait: undefined,
    };
    idToProposal.set(id, declinedProposal);
    updateInboxState(id, declinedProposal);
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
    const proposal = idToProposal.get(id);
    const objectInvokeHookP = (obj, [hookMethod, ...hookArgs] = []) => {
      if (hookMethod === undefined) {
        return undefined;
      }
      return E(obj)[hookMethod](...hookArgs);
    };
    const rejected = e => {
      if (alreadyAccepted) {
        return;
      }
      const rejectProposal = {
        ...proposal,
        status: 'rejected',
        error: `${e}`,
        wait: undefined,
      };
      idToProposal.set(id, rejectProposal);
      updateInboxState(id, rejectProposal);
    };

    try {
      const pendingProposal = {
        ...proposal,
        status: 'accept',
        wait: -1, // This should be an estimate as to number of ms until offer accepted.
      };
      idToProposal.set(id, pendingProposal);
      const compiledProposal = await idToCompiledProposalP.get(id);

      const { publicAPI } = compiledProposal;
      const {
        instanceInviteHook,
        seatTriggerHook,
        instanceAcceptedHook,
      } = proposal;
      const inviteP = objectInvokeHookP(publicAPI, instanceInviteHook);

      const { seat, depositedP, cancelObj } = await makeOffer(
        compiledProposal,
        inviteP,
      );

      idToCancelObj.set(id, cancelObj);
      ret = { seat, publicAPI };

      // =====================
      // === AWAITING TURN ===
      // =====================

      objectInvokeHookP(seat, seatTriggerHook).catch(rejected);

      // Update status, drop the offerRules
      depositedP.then(_ => {
        // We got something back, so no longer pending or rejected.
        alreadyAccepted = true;
        const acceptProposal = { ...pendingProposal, wait: undefined };
        idToProposal.set(id, acceptProposal);
        updateInboxState(id, acceptProposal);
        return objectInvokeHookP(publicAPI, instanceAcceptedHook);
      }, rejected);
    } catch (e) {
      rejected(e);
    }
    return ret;
  }

  function getIssuers() {
    return Array.from(issuerPetnameToIssuer);
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
    propose,
    declineOffer,
    cancelOffer,
    acceptOffer,
    getOfferDescriptions,
  });

  return wallet;
}
