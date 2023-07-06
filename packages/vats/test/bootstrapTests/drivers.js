// @ts-check
import { Fail, NonNullish } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { SECONDS_PER_MINUTE } from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';
import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import { slotToRemotable } from '@agoric/internal/src/storage-test-utils.js';
import { instanceNameFor } from '@agoric/inter-protocol/src/proposals/price-feed-proposal.js';

import { boardSlottingMarshaller } from '../../tools/board-utils.js';

/**
 * @param {ReturnType<typeof import('./supports.js').makeRunUtils>} runUtils
 * @param {import('@agoric/internal/src/storage-test-utils.js').FakeStorageKit} storage
 * @param {import('../../tools/board-utils.js').AgoricNamesRemotes} agoricNamesRemotes
 */
export const makeWalletFactoryDriver = async (
  runUtils,
  storage,
  agoricNamesRemotes,
) => {
  const { EV } = runUtils;

  /** @type {import('../../src/core/startWalletFactory.js').WalletFactoryStartResult} */
  const walletFactoryStartResult = await EV.vat('bootstrap').consumeItem(
    'walletFactoryStartResult',
  );
  /** @type {ERef<BankManager>} */
  const bankManager = await EV.vat('bootstrap').consumeItem('bankManager');
  const namesByAddressAdmin = await EV.vat('bootstrap').consumeItem(
    'namesByAddressAdmin',
  );

  const marshaller = boardSlottingMarshaller(slotToRemotable);

  /**
   * @param {string} walletAddress
   * @param {import('@agoric/smart-wallet/src/smartWallet.js').SmartWallet} walletPresence
   * @param {boolean} isNew
   */
  const makeWalletDriver = (walletAddress, walletPresence, isNew) => ({
    isNew,

    /**
     * @param {import('@agoric/smart-wallet/src/offers.js').OfferSpec} offer
     * @returns {Promise<void>}
     */
    executeOffer(offer) {
      const offerCapData = marshaller.toCapData(
        harden({
          method: 'executeOffer',
          offer,
        }),
      );
      return EV(walletPresence).handleBridgeAction(offerCapData, true);
    },
    /**
     * @param {import('@agoric/smart-wallet/src/offers.js').OfferSpec} offer
     * @returns {Promise<void>}
     */
    sendOffer(offer) {
      const offerCapData = marshaller.toCapData(
        harden({
          method: 'executeOffer',
          offer,
        }),
      );

      return EV.sendOnly(walletPresence).handleBridgeAction(offerCapData, true);
    },
    /** @param {string} offerId */
    tryExitOffer(offerId) {
      const capData = marshaller.toCapData(
        harden({
          method: 'tryExitOffer',
          offerId,
        }),
      );
      return EV(walletPresence).handleBridgeAction(capData, true);
    },
    /**
     * @template {import('@agoric/smart-wallet/src/types.js').OfferMaker} M
     *   offer maker function
     * @param {M} makeOffer
     * @param {Parameters<M>[1]} firstArg
     * @param {Parameters<M>[2]} [secondArg]
     * @returns {Promise<void>}
     */
    executeOfferMaker(makeOffer, firstArg, secondArg) {
      const offer = makeOffer(agoricNamesRemotes, firstArg, secondArg);
      return this.executeOffer(offer);
    },
    /**
     * @template {import('@agoric/smart-wallet/src/types.js').OfferMaker} M
     *   offer maker function
     * @param {M} makeOffer
     * @param {Parameters<M>[1]} firstArg
     * @param {Parameters<M>[2]} [secondArg]
     * @returns {Promise<void>}
     */
    sendOfferMaker(makeOffer, firstArg, secondArg) {
      const offer = makeOffer(agoricNamesRemotes, firstArg, secondArg);
      return this.sendOffer(offer);
    },

    /** @returns {import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord} */
    getCurrentWalletRecord() {
      const fromCapData = (...args) =>
        Reflect.apply(marshaller.fromCapData, marshaller, args);
      return unmarshalFromVstorage(
        storage.data,
        `published.wallet.${walletAddress}.current`,
        fromCapData,
      );
    },

    /** @returns {import('@agoric/smart-wallet/src/smartWallet.js').UpdateRecord} */
    getLatestUpdateRecord() {
      const fromCapData = (...args) =>
        Reflect.apply(marshaller.fromCapData, marshaller, args);
      return unmarshalFromVstorage(
        storage.data,
        `published.wallet.${walletAddress}`,
        fromCapData,
      );
    },
  });

  return {
    /**
     * Skip the provisionPool for tests
     *
     * @param {string} walletAddress
     * @returns {Promise<ReturnType<typeof makeWalletDriver>>}
     */
    async provideSmartWallet(walletAddress) {
      const bank = await EV(bankManager).getBankForAddress(walletAddress);
      return EV(walletFactoryStartResult.creatorFacet)
        .provideSmartWallet(walletAddress, bank, namesByAddressAdmin)
        .then(([walletPresence, isNew]) =>
          makeWalletDriver(walletAddress, walletPresence, isNew),
        );
    },
  };
};

/**
 * @param {string} collateralBrandKey
 * @param {import('../../tools/board-utils.js').AgoricNamesRemotes} agoricNamesRemotes
 * @param {Awaited<ReturnType<typeof makeWalletFactoryDriver>>} walletFactoryDriver
 * @param {string[]} oracleAddresses
 */
export const makePriceFeedDriver = async (
  collateralBrandKey,
  agoricNamesRemotes,
  walletFactoryDriver,
  oracleAddresses,
) => {
  const priceFeedName = instanceNameFor(collateralBrandKey, 'USD');

  const oracleWallets = await Promise.all(
    oracleAddresses.map(addr => walletFactoryDriver.provideSmartWallet(addr)),
  );

  const priceFeedInstance = agoricNamesRemotes.instance[priceFeedName];
  priceFeedInstance || Fail`no price feed ${priceFeedName}`;
  const adminOfferId = `accept-${collateralBrandKey}-oracleInvitation`;

  // accept invitations
  await Promise.all(
    oracleWallets.map(w =>
      w.executeOffer({
        id: adminOfferId,
        invitationSpec: {
          source: 'purse',
          instance: priceFeedInstance,
          description: 'oracle invitation',
        },
        proposal: {},
      }),
    ),
  );

  // zero is the initial lastReportedRoundId so causes an error: cannot report on previous rounds
  let roundId = 1n;
  return {
    /** @param {number} price */
    async setPrice(price) {
      await Promise.all(
        oracleWallets.map(w =>
          w.executeOfferMaker(
            Offers.fluxAggregator.PushPrice,
            {
              offerId: `push-${price}-${Date.now()}`,
              roundId,
              unitPrice: BigInt(price * 1_000_000),
            },
            adminOfferId,
          ),
        ),
      );
      // prepare for next round
      oracleWallets.push(NonNullish(oracleWallets.shift()));
      roundId += 1n;
      // TODO confirm the new price is written to storage
    },
  };
};

/** @typedef {Awaited<ReturnType<import('./supports.js').makeSwingsetTestKit>>} SwingsetTestKit */

/**
 * @param {SwingsetTestKit} testKit
 * @param {import('../../tools/board-utils.js').AgoricNamesRemotes} agoricNamesRemotes
 * @param {Awaited<ReturnType<typeof makeWalletFactoryDriver>>} walletFactoryDriver
 * @param {string[]} committeeAddresses
 */
export const makeGovernanceDriver = async (
  testKit,
  agoricNamesRemotes,
  walletFactoryDriver,
  committeeAddresses,
) => {
  const { EV } = testKit.runUtils;
  const charterMembershipId = 'charterMembership';
  const committeeMembershipId = 'committeeMembership';

  /** @type {ERef<import('@agoric/time/src/types.js').TimerService>} */
  const chainTimerService = await EV.vat('bootstrap').consumeItem(
    'chainTimerService',
  );

  let invitationsAccepted = false;

  const ecMembers = await Promise.all(
    committeeAddresses.map(address =>
      walletFactoryDriver.provideSmartWallet(address),
    ),
  );

  const ensureInvitationsAccepted = async () => {
    if (invitationsAccepted) {
      return;
    }
    // accept charter invitations
    {
      const instance = agoricNamesRemotes.instance.econCommitteeCharter;
      const promises = ecMembers.map(member =>
        member.executeOffer({
          id: charterMembershipId,
          invitationSpec: {
            source: 'purse',
            instance,
            description: 'charter member invitation',
          },
          proposal: {},
        }),
      );
      await Promise.all(promises);
    }
    // accept committee invitations
    {
      const instance = agoricNamesRemotes.instance.economicCommittee;
      const promises = ecMembers.map(member => {
        const description =
          member.getCurrentWalletRecord().purses[0].balance.value[0]
            .description;
        return member.executeOffer({
          id: committeeMembershipId,
          invitationSpec: {
            source: 'purse',
            instance,
            description,
          },
          proposal: {},
        });
      });
      await Promise.all(promises);
    }
    invitationsAccepted = true;
  };

  const proposeParams = async (instance, params, path) => {
    const now = await EV(chainTimerService).getCurrentTimestamp();

    await ecMembers[0].executeOffer({
      id: 'propose',
      invitationSpec: {
        invitationMakerName: 'VoteOnParamChange',
        previousOffer: charterMembershipId,
        source: 'continuing',
      },
      offerArgs: {
        deadline: SECONDS_PER_MINUTE + now.absValue,
        instance,
        params,
        path,
      },
      proposal: {},
    });
  };

  const enactLatestProposal = async () => {
    const latestQuestionRecord = testKit.readLatest(
      'published.committees.Economic_Committee.latestQuestion',
    );

    const chosenPositions = [latestQuestionRecord.positions[0]];

    const promises = ecMembers.map(member =>
      member.executeOffer({
        id: 'voteInNewLimit',
        invitationSpec: {
          source: 'continuing',
          previousOffer: committeeMembershipId,
          invitationMakerName: 'makeVoteInvitation',
          // (positionList, questionHandle)
          invitationArgs: harden([
            chosenPositions,
            latestQuestionRecord.questionHandle,
          ]),
        },
        proposal: {},
      }),
    );
    await Promise.all(promises);
  };

  return {
    /**
     * @param {Instance} instance
     * @param {object} params
     * @param {object} [path]
     */
    async changeParams(instance, params, path) {
      instance || Fail`missing instance`;
      await ensureInvitationsAccepted();
      await proposeParams(instance, params, path);
      await enactLatestProposal();
      await testKit.advanceTimeBy(1, 'minutes');
    },
  };
};

/** @param {SwingsetTestKit} testKit */
export const makeZoeDriver = async testKit => {
  const { EV } = testKit.runUtils;
  const zoe = await EV.vat('bootstrap').consumeItem('zoe');
  const chainStorage = await EV.vat('bootstrap').consumeItem('chainStorage');
  const storageNode = await EV(chainStorage).makeChildNode('prober-asid9a');
  let creatorFacet;
  let adminFacet;
  let brand;
  const sub = (a, v) => {
    return { brand: a.brand, value: a.value - v };
  };

  return {
    async instantiateProbeContract(probeContractBundle) {
      const installation = await EV(zoe).install(probeContractBundle);
      const startResults = await EV(zoe).startInstance(
        installation,
        undefined,
        undefined,
        { storageNode },
        'probe',
      );
      ({ creatorFacet, adminFacet } = startResults);

      const issuers = await EV(zoe).getIssuers(startResults.instance);
      const brands = await EV(zoe).getBrands(startResults.instance);
      brand = brands.Ducats;
      return { creatorFacet, issuer: issuers.Ducats, brand };
    },
    async upgradeProbe(probeContractBundle) {
      const fabricateBundleId = bundle => {
        return `b1-${bundle.endoZipBase64Sha512}`;
      };

      await EV(adminFacet).upgradeContract(
        fabricateBundleId(probeContractBundle),
      );
    },

    verifyRealloc() {
      return EV(creatorFacet).getAllocation();
    },
    async probeReallocation(value, payment) {
      const stagingInv = await EV(creatorFacet).makeProbeStagingInvitation();

      const stagingSeat = await EV(zoe).offer(
        stagingInv,
        { give: { Ducats: value } },
        { Ducats: payment },
      );
      const helperPayments = await EV(stagingSeat).getPayouts();

      const helperInv = await EV(creatorFacet).makeProbeHelperInvitation();
      const helperSeat = await EV(zoe).offer(
        helperInv,
        { give: { Ducats: sub(value, 1n) } },
        { Ducats: helperPayments.Ducats },
      );
      const internalPayments = await EV(helperSeat).getPayouts();

      const internalInv = await EV(creatorFacet).makeProbeInternalInvitation();
      const internalSeat = await EV(zoe).offer(
        internalInv,
        { give: { Ducats: sub(value, 2n) } },
        { Ducats: internalPayments.Ducats },
      );
      const leftoverPayments = await EV(internalSeat).getPayouts();

      return {
        stagingResult: await EV(stagingSeat).getOfferResult(),
        helperResult: await EV(helperSeat).getOfferResult(),
        internalResult: await EV(internalSeat).getOfferResult(),
        leftoverPayments,
      };
    },
    async faucet() {
      const faucetInv = await EV(creatorFacet).makeFaucetInvitation();
      const seat = await EV(zoe).offer(faucetInv);

      return EV(seat).getPayout('Ducats');
    },
  };
};
