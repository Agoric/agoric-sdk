// @ts-check

import { AmountMath } from '@agoric/ertp';
import { E, Far } from '@endo/far';
import { observeNotifier } from '@agoric/notifier';
import { makeScalarSetStore } from '@agoric/store';

/**
 * @typedef {object} FeeCollector
 *
 * @property {() => ERef<Payment>} collectFees
 */

/**
 * @typedef {object} PeriodicFeeCollector
 * @property {() => FeeCollector} getCollector
 * @property {() => Promise<void>} collectAndDistributeNow
 * @property {() => void} stop
 */

/**
 * @typedef {object} CollectibleContractFacet
 * @property {() => Promise<Invitation>} makeCollectFeesInvitation
 */

/**
 * wrapper to take the vaultFactory or AMM's creatorFacet, and make a call that
 * will request an invitation and return a promise for a payment.
 *
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<CollectibleContractFacet>} creatorFacet
 */
export const makeContractFeeCollector = (zoe, creatorFacet) => {
  /** @type {FeeCollector} */
  return Far('feeCollector', {
    collectFees: () => {
      const invitation = E(creatorFacet).makeCollectFeesInvitation();
      const collectFeesSeat = E(zoe).offer(invitation, undefined, undefined);
      return E(collectFeesSeat).getPayout('RUN');
    },
  });
};

/**
 * A distributor of fees from Inter Protocol sources to deposit facets. Each
 * time the epochTimer signals the end of an Epoch, it will ask the contracts
 * for fees that have been collected to date and send that payment to the
 * depositFacet.
 *
 * @param {() => Promise<unknown>} schedulePayments - distribute to the destinations
 * @param {ERef<TimerService>} timerService - timer that is used to schedule collections
 * @param {RelativeTime} [collectionInterval] - how often to collect fees in the
 * `timerService` unit
 */
export const startDistributing = (
  schedulePayments,
  timerService,
  collectionInterval = 1n,
) => {
  const timeObserver = {
    updateState: _ =>
      schedulePayments().catch(e => {
        console.error('failed with', e);
        throw e;
      }),
    fail: reason => {
      throw Error(`fee distributor timer failed: ${reason}`);
    },
    finish: done => {
      throw Error(`fee distributor timer died: ${done}`);
    },
  };

  const collectionNotifier = E(timerService).makeNotifier(
    0n,
    collectionInterval,
  );
  observeNotifier(collectionNotifier, timeObserver).catch(e => {
    console.error('fee distributor failed with', e);
  });
};

/**
 * @typedef {{ pushPayment: (payment: Payment, issuer: ERef<Issuer>) => Promise<Amount>}} FeeDestination
 *
 * @param {Record<Keyword, ERef<FeeDestination>>} [destinations]
 * @param {Record<Keyword, bigint>} [keywordShares]
 */
export const makeShareConfig = (destinations = {}, keywordShares = {}) => {
  let totalShares = 0n;
  const shares = Object.entries(destinations)
    .filter(([_, dst]) => dst)
    .map(([kw, destination]) => {
      const share = keywordShares[kw];
      assert.typeof(share, 'bigint', `${kw} must be a bigint; got ${share}`);
      totalShares += share;
      return {
        share,
        destination,
      };
    });
  return { shares, totalShares };
};

/** @typedef {ReturnType<typeof makeShareConfig>} ShareConfig */

/**
 * Split and deposit a payment given a share configuration.
 *
 * @param {Payment} payment
 * @param {ERef<Issuer>} issuer
 * @param {ShareConfig} shareConfig
 */
export const sharePayment = async (
  payment,
  issuer,
  { shares, totalShares },
) => {
  // Divide the payment into shares.
  if (!shares.length) {
    return;
  }

  /** @type {Amount<'nat'>} */
  const paymentAmount = await E(issuer).getAmountOf(payment);
  if (AmountMath.isEmpty(paymentAmount)) {
    return;
  }
  const { value: totalValue, brand } = paymentAmount;

  let remainder = totalValue;
  const destinedAmountEntries = shares
    .map(({ share, destination }, i) => {
      const value =
        i === shares.length - 1
          ? remainder
          : (totalValue * share) / totalShares;
      remainder -= value;
      return /** @type {const} */ ([
        destination,
        AmountMath.make(brand, value),
      ]);
    })
    .filter(([_, amt]) => !AmountMath.isEmpty(amt));

  // Split the payment, which asserts conservation of the total.
  const sharedPayment = await E(issuer).splitMany(
    payment,
    destinedAmountEntries.map(([_dst, amt]) => amt),
  );

  // Send each nonempty payment to the corresponding destination.
  await Promise.all(
    destinedAmountEntries.map(([destination], i) =>
      E(destination).pushPayment(sharedPayment[i], issuer),
    ),
  );
};

/**
 * @param {ERef<Issuer>} feeIssuer
 * @param {{ keywordShares: Record<Keyword, bigint>, timerService: ERef<TimerService>, collectionInterval: RelativeTime}} terms
 */
export const makeFeeDistributor = (feeIssuer, terms) => {
  const { timerService, collectionInterval } = terms;

  /** @type {Record<string, ERef<FeeDestination>>} */
  let destinations = {};
  let shareConfig = makeShareConfig(destinations, terms.keywordShares);

  /** @type {SetStore<FeeCollector>} */
  const collectors = makeScalarSetStore();

  /** @param {Payment} payment */
  const distributeFees = payment =>
    sharePayment(payment, feeIssuer, shareConfig);

  const schedulePayments = async () => {
    if (shareConfig.totalShares <= 0n) {
      return;
    }
    await Promise.all(
      [...collectors.values()].map(collector =>
        E(collector).collectFees().then(distributeFees),
      ),
    );
  };

  const publicFacet = Far('feeDistributor publicFacet', {
    distributeFees,
  });

  const creatorFacet = Far('feeDistributor creatorFacet', {
    makeContractFeeCollector,
    /**
     * Start distributing fees from this collector.
     *
     * @param {string} debugName
     * @param {ERef<FeeCollector>} collectorP
     */
    startPeriodicCollection: async (debugName, collectorP) => {
      const collector = await collectorP;

      /** @type {PeriodicFeeCollector} */
      const periodicCollector = Far('PeriodicFeeCollector', {
        getDebugName: () => debugName,
        getCollector: () => collector,
        collectAndDistributeNow: async () => {
          if (shareConfig.totalShares <= 0n) {
            return;
          }
          const payment = await E(collector).collectFees();
          await distributeFees(payment);
        },
        stop: () => {
          collectors.delete(collector);
        },
      });

      // Run once immediately for this collector, to test that the registration
      // will work.
      await E(periodicCollector).collectAndDistributeNow();

      collectors.add(collector);
      return periodicCollector;
    },

    /**
     * @param {EOnly<DepositFacet>} depositFacet
     */
    makeDepositFacetDestination: depositFacet => {
      return Far(`DepositFacetDestination`, {
        pushPayment: async (payment, _issuer) => {
          return E(depositFacet).receive(payment);
        },
      });
    },
    /**
     * Create a destination that generates invitations and makes Zoe offers.
     *
     * @param {ERef<ZoeService>} zoe
     * @param {string} keyword
     * @param {unknown} target
     * @param {PropertyKey} makeInvitationMethod
     * @param {unknown[]} [args]
     */
    makeOfferDestination: (
      zoe,
      keyword,
      target,
      makeInvitationMethod,
      args = [],
    ) => {
      return Far(`${String(makeInvitationMethod)} OfferDestination`, {
        pushPayment: async (payment, issuer) => {
          const paymentAmount = await E(issuer).getAmountOf(payment);

          // Give the payment to the contract via its invitation.
          const invitation = E(target)[makeInvitationMethod](...args);
          const result = E(zoe).offer(
            invitation,
            {
              give: {
                [keyword]: paymentAmount,
              },
            },
            {
              [keyword]: payment,
            },
          );

          // Assert that the offer completed.
          await E(result).getOfferResult();

          // We deliberately drop our payouts on the floor, since the ERTP purse
          // recovery mechanism can get them back to the distributor contract.
          return paymentAmount;
        },
      });
    },

    /**
     * @param {Record<Keyword, FeeDestination>} newDestinations
     */
    setDestinations: async newDestinations => {
      destinations = newDestinations;
      shareConfig = makeShareConfig(destinations, terms.keywordShares);
      // Run once immediately for these destinations.
      await schedulePayments();
    },
  });

  // Start processing collections.
  startDistributing(schedulePayments, timerService, collectionInterval);

  return harden({
    creatorFacet,
    publicFacet,
  });
};

/** @typedef {ReturnType<typeof makeFeeDistributor>['creatorFacet']} FeeDistributorCreatorFacet */
/** @typedef {ReturnType<typeof makeFeeDistributor>['publicFacet']} FeeDistributorPublicFacet */

/**
 * @param {ZCF<Parameters<typeof makeFeeDistributor>[1]>} zcf
 */
export const start = async zcf => {
  const feeIssuer = E(zcf.getZoeService()).getFeeIssuer();
  return makeFeeDistributor(feeIssuer, zcf.getTerms());
};
