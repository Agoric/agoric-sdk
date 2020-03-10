import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';
import makeStore from '@agoric/weak-store';
import produceIssuer from '@agoric/ertp';
import { assert, details } from '@agoric/assert';
import makePromise from '@agoric/make-promise';

import { cleanOfferRules, fillInUserOfferRules } from './cleanOfferRules';
import { arrayToObj, objToArray } from './roleConversion';
import { isOfferSafeForAll } from './isOfferSafe';
import { areRightsConserved } from './areRightsConserved';
import { evalContractCode } from './evalContractCode';
import { makeTables } from './state';

/**
 * Create an instance of Zoe.
 *
 * @param additionalEndowments pure or pure-ish endowments to add to evaluator
 */
const makeZoe = (additionalEndowments = {}) => {
  // Zoe maps the inviteHandles to contract seats
  const handleToSeat = makeStore();
  const {
    mint: inviteMint,
    issuer: inviteIssuer,
    amountMath: inviteAmountMath,
  } = produceIssuer('zoeInvite', 'set');

  // All of the Zoe state is stored in these tables built on WeakMaps
  const {
    installationTable,
    instanceTable,
    offerTable,
    payoutMap,
    issuerTable,
  } = makeTables();

  const completeOffers = (instanceHandle, offerHandles) => {
    const { inactive } = offerTable.getOfferStatuses(offerHandles);
    if (inactive.length > 0) {
      throw new Error(`offer has already completed`);
    }
    const offers = offerTable.getOffers(offerHandles);

    const { issuers, roleNames } = instanceTable.get(instanceHandle);

    // Remove the offers from the offerTable so that they are no
    // longer active.
    offerTable.deleteOffers(offerHandles);

    // Resolve the payout promises with the payouts
    const pursePs = issuerTable.getPursesForIssuers(issuers);
    for (const offer of offers) {
      const payout = {};
      roleNames.forEach((roleName, i) => {
        payout[roleName] = E(pursePs[i]).withdraw(offer.amounts[roleName]);
      });
      harden(payout);
      payoutMap.get(offer.handle).res(payout);
    }
  };

  const assertRoleName = roleName => {
    const firstCapASCII = /^[A-Z][a-zA-Z0-9_$]*$/;
    assert(
      firstCapASCII.test(roleName),
      details`roleName must be ascii and must start with a capital letter.`,
    );
  };

  const getRoleNames = roles => {
    // `getOwnPropertyNames` returns all the non-symbol properties
    // (both enumerable and non-enumerable).
    const roleNames = Object.getOwnPropertyNames(roles);
    // We sort to get a deterministic order that is not based on key
    // insertion order or object creation order.
    roleNames.sort();
    harden(roleNames);

    // Insist that there are no symbol properties.
    assert(
      Object.getOwnPropertySymbols(roles).length === 0,
      details`no symbol properties allowed`,
    );

    // Assert all key characters are ascii and keys start with a
    // capital letter.
    roleNames.forEach(assertRoleName);

    return roleNames;
  };

  // Make a safe(r) object from keys that have been validated
  const makeCleanedObj = (rawObj, cleanedKeys) =>
    cleanedKeys.reduce((obj, key) => {
      obj[key] = rawObj[key];
      return obj;
    }, {});

  // Make a Zoe invite with an extent that is a mix of credible
  // information from Zoe (the `handle` and `instanceHandle`) and
  // other information defined by the smart contract. Note that the
  // smart contract cannot override or change the values of `handle`
  // and `instanceHandle`.
  const makeInvite = (instanceHandle, seat, customProperties = harden({})) => {
    const inviteHandle = harden({});
    const inviteAmount = inviteAmountMath.make(
      harden([
        {
          ...customProperties,
          handle: inviteHandle,
          instanceHandle,
        },
      ]),
    );
    handleToSeat.init(inviteHandle, seat);
    const invitePayment = inviteMint.mintPayment(inviteAmount);
    return harden({ invite: invitePayment, inviteHandle });
  };

  // Zoe has two different facets: the public Zoe service and the
  // contract facet. The contract facet is what is accessible to the
  // smart contract instance and is remade for each instance. The
  // contract at no time has access to the users' payments or the Zoe
  // purses. The contract can only do a few things through the Zoe
  // contract facet. It can propose a reallocation of amount,
  // complete an offer, and can create a new offer itself for
  // record-keeping and other various purposes.

  const makeContractFacet = instanceHandle => {
    const contractFacet = harden({
      /**
       * The contract can propose a reallocation of extents per
       * offer, which will only succeed if the reallocation 1)
       * conserves rights, and 2) is 'offer-safe' for all parties
       * involved. This reallocation is partial, meaning that it
       * applies only to the amount associated with the offerHandles
       * that are passed in. We are able to ensure that with
       * each reallocation, rights are conserved and offer safety is
       * enforced for all offers, even though the reallocation is
       * partial, because once these invariants are true, they will
       * remain true until changes are made.
       * @param  {object[]} offerHandles - an array of offerHandles
       * @param  {amountObj[]} amountObjs - an array of amountObjs -
       * objects keyed by roles with amount values, with
       * one amountObj per offerHandle.
       */
      reallocate: (offerHandles, amountObjs) => {
        const { roleNames, issuers } = instanceTable.get(instanceHandle);

        const newAmountMatrix = amountObjs.map(amountObj =>
          objToArray(amountObj, roleNames),
        );

        const offers = offerTable.getOffers(offerHandles);

        const payoutRuleMatrix = offers.map(
          offer => offer.offerRules.payoutRules,
        );
        const currentAmountMatrix = offers.map(offer =>
          objToArray(offer.amounts, roleNames),
        );
        const amountMaths = issuerTable.getAmountMathForIssuers(issuers);

        // 1) ensure that rights are conserved
        assert(
          areRightsConserved(amountMaths, currentAmountMatrix, newAmountMatrix),
          details`Rights are not conserved in the proposed reallocation`,
        );

        // 2) ensure 'offer safety' for each player
        assert(
          isOfferSafeForAll(amountMaths, payoutRuleMatrix, newAmountMatrix),
          details`The proposed reallocation was not offer safe`,
        );

        // 3) save the reallocation
        offerTable.updateAmounts(offerHandles, harden(amountObjs));
      },

      /**
       * The contract can "complete" an offer to remove it from the
       * ongoing contract and resolve the player's payouts (either
       * winnings or refunds). Because Zoe only allows for
       * reallocations that conserve rights and are 'offer-safe', we
       * don't need to do those checks at this step and can assume
       * that the invariants hold.
       * @param  {object[]} offerHandles - an array of offerHandles
       */
      complete: offerHandles => completeOffers(instanceHandle, offerHandles),

      /**
       * Make a credible Zoe invite for a particular smart contract
       * indicated by the unique `instanceHandle`. The other
       * information in the extent of this invite is decided by the
       * governing contract and should include whatever information is
       * necessary for a potential buyer of the invite to know what
       * they are getting. Note: if information can be derived in
       * queries based on other information, we choose to omit it. For
       * instance, `installationHandle` can be derived from
       * `instanceHandle` and is omitted even though it is useful.
       * @param  {object} seat - an object defined by the smart
       * contract that is the use right associated with the invite. In
       * other words, buying the invite is buying the right to call
       * methods on this object.
       * @param  {object} customProperties - an object of
       * information to include in the extent, as defined by the smart
       * contract
       */
      makeInvite: (seat, customProperties) =>
        makeInvite(instanceHandle, seat, customProperties),

      // Informs Zoe about an issuer and returns a promise for acknowledging
      // when the issuer is added and ready.
      addNewIssuer: (issuer, roleName) =>
        issuerTable.getPromiseForIssuerRecord(issuer).then(_ => {
          assertRoleName(roleName);
          const { roles, roleNames, issuers } = instanceTable.get(
            instanceHandle,
          );
          const newRoles = { ...roles, [roleName]: issuer };
          // We append the new roleName and new issuer to the end of
          // the arrays.
          const newRoleNames = [...roleNames, roleName];
          const newIssuers = [...issuers, issuer];
          instanceTable.update(instanceHandle, {
            issuers: newIssuers,
            roles: newRoles,
            roleNames: newRoleNames,
          });
        }),

      // eslint-disable-next-line no-use-before-define
      getZoeService: () => zoeService,

      // The methods below are pure and have no side-effects //
      getInviteIssuer: () => inviteIssuer,
      getAmountMathForIssuers: issuerTable.getAmountMathForIssuers,
      getAmountMathForRole: roleName => {
        const { roles } = instanceTable.get(instanceHandle);
        const issuer = roles[roleName];
        return issuerTable.get(issuer).amountMath;
      },
      getBrandsForIssuers: issuerTable.getBrandsForIssuers,
      getOfferStatuses: offerTable.getOfferStatuses,
      isOfferActive: offerTable.isOfferActive,
      getOffers: offerTable.getOffers,
      getOffer: offerTable.get,
      getInstanceRecord: () => instanceTable.get(instanceHandle),
    });
    return contractFacet;
  };

  // The public Zoe service has four main methods: `install` takes
  // contract code and registers it with Zoe associated with an
  // `installationHandle` for identification, `makeInstance` creates
  // an instance from an installation, `getInstance` credibly
  // retrieves an instance from Zoe, and `redeem` allows users to
  // securely escrow and get a seat and payouts in return.

  const zoeService = harden({
    getInviteIssuer: () => inviteIssuer,

    /**
     * Create an installation by safely evaluating the code and
     * registering it with Zoe. We have a moduleFormat to allow for
     * different future formats without silent failures.
     */
    install: (code, moduleFormat = 'nestedEvaluate') => {
      let installation;
      switch (moduleFormat) {
        case 'nestedEvaluate':
        case 'getExport': {
          installation = evalContractCode(code, additionalEndowments);
          break;
        }
        default: {
          assert.fail(
            details`Unimplemented installation moduleFormat ${moduleFormat}`,
          );
        }
      }
      const installationHandle = installationTable.create(
        harden({ installation }),
      );
      return installationHandle;
    },

    /**
     * Makes a contract instance from an installation and returns a
     * unique handle for the instance that can be shared, as well as
     * other information, such as the terms used in the instance.
     * @param  {object} installationHandle - the unique handle for the
     * installation
     * @param  {object} roles - an object mapping roleName keys to
     * issuer values
     * @param  {object} terms - arguments to the contract. These
     * arguments depend on the contract.
     */
    makeInstance: (installationHandle, roles, terms = harden({})) => {
      const { installation } = installationTable.get(installationHandle);
      const instanceHandle = harden({});
      const contractFacet = makeContractFacet(instanceHandle);

      const roleNames = getRoleNames(roles);
      const issuers = roleNames.map(name => roles[name]);
      // Take the cleaned roleNames and produce a safe(r) roles obj
      const cleanedRoles = makeCleanedObj(roles, roleNames);

      // The issuers may not have been seen before, so we must wait for
      // the issuer records to be available synchronously
      return issuerTable
        .getPromiseForIssuerRecords(issuers)
        .then(issuerRecords => {
          const instanceRecord = harden({
            installationHandle,
            publicAPI: undefined,
            terms,
            issuers: issuerRecords.map(record => record.issuer),
            roles: cleanedRoles,
            roleNames,
          });

          instanceTable.create(instanceRecord, instanceHandle);
          return Promise.resolve(installation.makeContract(contractFacet)).then(
            ({ invite, publicAPI }) => {
              instanceTable.update(instanceHandle, { publicAPI });
              return invite;
            },
          );
        });
    },
    /**
     * Credibly retrieves an instance record given an instanceHandle.
     * @param {object} instanceHandle - the unique, unforgeable
     * identifier (empty object) for the instance
     */
    getInstance: instanceTable.get,

    /**
     * Redeem the invite to receive a seat and a payout
     * promise.
     * @param {payment} invite - an invite (ERTP payment) to join a
     * Zoe smart contract instance
     * @param  {offerRule[]} offerRules - the offer rules, an object
     * with properties `payoutRules` and `exitRule`.
     * @param  {payment[]} offerPayments - payments corresponding to
     * the offer rules. A payment may be `undefined` in the case of
     * specifying a `wantAtLeast`.
     */
    redeem: (invite, userOfferRules, offerPayments) => {
      const inviteAmount = inviteIssuer.burn(invite);
      assert(
        inviteAmount.extent.length === 1,
        'only one invite should be redeemed',
      );

      const {
        extent: [{ instanceHandle, handle: offerHandle }],
      } = inviteAmount;

      const { roleNames, issuers } = instanceTable.get(instanceHandle);

      const amountMaths = issuerTable.getAmountMathForIssuers(issuers);
      const amountMathsObj = arrayToObj(amountMaths, roleNames);

      userOfferRules = fillInUserOfferRules(
        roleNames,
        amountMathsObj,
        userOfferRules,
      );

      const offerRules = cleanOfferRules(
        roleNames,
        amountMaths,
        userOfferRules,
      );

      // Create result to be returned. Depends on exitRule
      const makeRedemptionResult = _ => {
        const redemptionResult = {
          seat: handleToSeat.get(offerHandle),
          payout: payoutMap.get(offerHandle).p,
        };
        const { exitRule } = offerRules;
        // Automatically cancel on deadline.
        if (exitRule.kind === 'afterDeadline') {
          E(exitRule.timer).setWakeup(
            exitRule.deadline,
            harden({
              wake: () => completeOffers(instanceHandle, harden([offerHandle])),
            }),
          );
          // Add an object with a cancel method to redemptionResult in
          // order to cancel on demand.
        } else if (exitRule.kind === 'onDemand') {
          redemptionResult.cancelObj = {
            cancel: () => completeOffers(instanceHandle, harden([offerHandle])),
          };
        } else {
          assert(
            exitRule.kind === 'Waved',
            `exitRule kind was not recognized: ${exitRule.kind}`,
          );
        }

        // if the exitRule.kind is 'waived' the user has no
        // possibility of cancelling
        return harden(redemptionResult);
      };

      // Promise flow = issuer -> purse -> deposit payment -> escrow receipt
      const paymentDepositedPs = issuers.map((issuer, i) => {
        const issuerRecordP = issuerTable.getPromiseForIssuerRecord(issuer);
        const payoutRule = offerRules.payoutRules[i];

        return issuerRecordP.then(({ purse, amountMath }) => {
          if (payoutRule.kind === 'offerAtMost') {
            // We cannot trust these amounts since they come directly
            // from the remote issuer and so we must coerce them.
            return E(purse)
              .deposit(offerPayments[roleNames[i]], payoutRule.amount)
              .then(_ => amountMath.coerce(payoutRule.amount));
          }
          // If any other payments are included, they are ignored.
          return Promise.resolve(amountMath.getEmpty());
        });
      });

      return Promise.all(paymentDepositedPs)
        .then(amountsArray => {
          const offerImmutableRecord = {
            instanceHandle,
            userOfferRules,
            offerRules,
            issuers,
            amounts: arrayToObj(amountsArray, roleNames),
          };
          // Since we have redeemed an invite, the inviteHandle is
          // also the offerHandle.
          offerTable.create(offerImmutableRecord, offerHandle);
          payoutMap.init(offerHandle, makePromise());
        })
        .then(makeRedemptionResult);
    },
  });
  return zoeService;
};

export { makeZoe };
