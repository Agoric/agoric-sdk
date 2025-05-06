/* eslint-disable jsdoc/require-param */
import { Fail } from '@endo/errors';
import { NonNullish } from '@agoric/internal';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { SECONDS_PER_MINUTE } from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';
import {
  slotToBoardRemote,
  unmarshalFromVstorage,
} from '@agoric/internal/src/marshal.js';
import {
  type FakeStorageKit,
  slotToRemotable,
} from '@agoric/internal/src/storage-test-utils.js';
import { oracleBrandFeedName } from '@agoric/inter-protocol/src/proposals/utils.js';

import {
  type AgoricNamesRemotes,
  boardSlottingMarshaller,
} from '@agoric/vats/tools/board-utils.js';
import type {
  CurrentWalletRecord,
  SmartWallet,
  UpdateRecord,
} from '@agoric/smart-wallet/src/smartWallet.js';
import type { WalletFactoryStartResult } from '@agoric/vats/src/core/startWalletFactory.js';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { TimerService } from '@agoric/time';
import type { OfferMaker } from '@agoric/smart-wallet/src/types.js';
import type { RunUtils } from '@agoric/swingset-vat/tools/run-utils.js';
import { makeMarshal } from '@endo/marshal';
import type { SwingsetTestKit } from './supports.js';

// XXX SwingsetTestKit would simplify this
export const makeWalletFactoryDriver = async (
  runUtils: RunUtils,
  storage: FakeStorageKit,
  agoricNamesRemotes: AgoricNamesRemotes,
) => {
  const { EV } = runUtils;

  const walletFactoryStartResult: WalletFactoryStartResult = await EV.vat(
    'bootstrap',
  ).consumeItem('walletFactoryStartResult');
  const bankManager: ERef<BankManager> =
    await EV.vat('bootstrap').consumeItem('bankManager');
  const namesByAddressAdmin = await EV.vat('bootstrap').consumeItem(
    'namesByAddressAdmin',
  );

  const marshaller = boardSlottingMarshaller(slotToRemotable);

  const makeWalletDriver = (
    walletAddress: string,
    walletPresence: SmartWallet,
    isNew: boolean,
  ) => ({
    isNew,
    getAddress: () => walletAddress,

    executeOffer(offer: OfferSpec): Promise<void> {
      const offerCapData = marshaller.toCapData(
        harden({
          method: 'executeOffer',
          offer,
        }),
      );
      return EV(walletPresence).handleBridgeAction(offerCapData, true);
    },
    sendOffer(offer: OfferSpec): Promise<void> {
      const offerCapData = marshaller.toCapData(
        harden({
          method: 'executeOffer',
          offer,
        }),
      );

      return EV.sendOnly(walletPresence).handleBridgeAction(offerCapData, true);
    },
    tryExitOffer(offerId: string) {
      const capData = marshaller.toCapData(
        harden({
          method: 'tryExitOffer',
          offerId,
        }),
      );
      return EV(walletPresence).handleBridgeAction(capData, true);
    },
    executeOfferMaker<M extends OfferMaker>(
      makeOffer: M,
      firstArg: Parameters<M>[1],
      secondArg?: Parameters<M>[2],
    ): Promise<void> {
      const offer = makeOffer(agoricNamesRemotes, firstArg, secondArg);
      return this.executeOffer(offer);
    },
    sendOfferMaker<M extends OfferMaker>(
      makeOffer: M,
      firstArg: Parameters<M>[1],
      secondArg?: Parameters<M>[2],
    ): Promise<void> {
      const offer = makeOffer(agoricNamesRemotes, firstArg, secondArg);
      return this.sendOffer(offer);
    },

    getCurrentWalletRecord(): CurrentWalletRecord {
      return unmarshalFromVstorage(
        storage.data,
        `published.wallet.${walletAddress}.current`,
        (...args) => Reflect.apply(marshaller.fromCapData, marshaller, args),
        -1,
      ) as any;
    },

    getLatestUpdateRecord(): UpdateRecord {
      return unmarshalFromVstorage(
        storage.data,
        `published.wallet.${walletAddress}`,
        (...args) => Reflect.apply(marshaller.fromCapData, marshaller, args),
        -1,
      ) as any;
    },
  });

  return {
    /**
     * Skip the provisionPool for tests
     */
    async provideSmartWallet(
      walletAddress: string,
    ): Promise<ReturnType<typeof makeWalletDriver>> {
      const bank = await EV(bankManager).getBankForAddress(walletAddress);
      return EV(walletFactoryStartResult.creatorFacet)
        .provideSmartWallet(walletAddress, bank, namesByAddressAdmin)
        .then(([walletPresence, isNew]) =>
          makeWalletDriver(walletAddress, walletPresence, isNew),
        );
    },
  };
};
export type WalletFactoryDriver = Awaited<
  ReturnType<typeof makeWalletFactoryDriver>
>;

export type SmartWalletDriver = Awaited<
  ReturnType<WalletFactoryDriver['provideSmartWallet']>
>;

export const makePriceFeedDriver = async (
  collateralBrandKey: string,
  agoricNamesRemotes: AgoricNamesRemotes,
  walletFactoryDriver: WalletFactoryDriver,
  oracleAddresses: string[],
) => {
  const priceFeedName = oracleBrandFeedName(collateralBrandKey, 'USD');

  const oracleWallets = await Promise.all(
    oracleAddresses.map(addr => walletFactoryDriver.provideSmartWallet(addr)),
  );

  let nonce = 0;
  let adminOfferId;
  const acceptInvitations = async () => {
    const priceFeedInstance = agoricNamesRemotes.instance[priceFeedName];
    priceFeedInstance || Fail`no price feed ${priceFeedName}`;
    nonce += 1;
    adminOfferId = `accept-${collateralBrandKey}-oracleInvitation${nonce}`;
    return Promise.all(
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
  };
  await acceptInvitations();

  // zero is the initial lastReportedRoundId so causes an error: cannot report on previous rounds
  let roundId = 1n;
  return {
    async setPrice(price: number) {
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
    async refreshInvitations() {
      roundId = 1n;
      await acceptInvitations();
    },
  };
};
harden(makePriceFeedDriver);
export type PriceFeedDriver = Awaited<ReturnType<typeof makePriceFeedDriver>>;

export const makeGovernanceDriver = async (
  testKit: SwingsetTestKit,
  agoricNamesRemotes: AgoricNamesRemotes,
  walletFactoryDriver: WalletFactoryDriver,
  committeeAddresses: string[],
) => {
  const { EV } = testKit.runUtils;
  const charterMembershipId = 'charterMembership';
  const committeeMembershipId = 'committeeMembership';

  const { fromCapData } = makeMarshal(undefined, slotToBoardRemote);

  const chainTimerService: ERef<TimerService> =
    await EV.vat('bootstrap').consumeItem('chainTimerService');

  let invitationsAccepted = false;

  const smartWallets = await Promise.all(
    committeeAddresses.map(address =>
      walletFactoryDriver.provideSmartWallet(address),
    ),
  );

  const findInvitation = (wallet, descriptionSubstr) => {
    return wallet
      .getCurrentWalletRecord()
      .purses[0].balance.value.find(v =>
        v.description.startsWith(descriptionSubstr),
      );
  };

  const ecMembers = smartWallets.map(w => ({
    ...w,
    acceptOutstandingCharterInvitation: async (
      charterOfferId = charterMembershipId,
      instance = agoricNamesRemotes.instance.econCommitteeCharter,
    ) => {
      if (!findInvitation(w, 'charter member invitation')) {
        console.log('No charter member invitation found');
        return;
      }
      await w.executeOffer({
        id: charterOfferId,
        invitationSpec: {
          source: 'purse',
          instance,
          description: 'charter member invitation',
        },
        proposal: {},
      });
    },
    acceptOutstandingCommitteeInvitation: async (
      committeeOfferId = committeeMembershipId,
      instance = agoricNamesRemotes.instance.economicCommittee,
    ) => {
      const invitation = findInvitation(w, 'Voter');
      if (!invitation) {
        console.log('No committee member invitation found');
        return;
      }
      await w.executeOffer({
        id: committeeOfferId,
        invitationSpec: {
          source: 'purse',
          instance,
          description: invitation.description,
        },
        proposal: {},
      });
    },
    voteOnLatestProposal: async (
      voteId = 'voteInNewLimit',
      committeeId = committeeMembershipId,
    ) => {
      const latestQuestionRecord = testKit.readPublished(
        'committees.Economic_Committee.latestQuestion',
      );

      const chosenPositions = [latestQuestionRecord.positions[0]];

      await w.executeOffer({
        id: voteId,
        invitationSpec: {
          source: 'continuing',
          previousOffer: committeeId,
          invitationMakerName: 'makeVoteInvitation',
          // (positionList, questionHandle)
          invitationArgs: harden([
            chosenPositions,
            latestQuestionRecord.questionHandle,
          ]),
        },
        proposal: {},
      });
    },
    findOracleInvitation: async () => {
      const purse = w
        .getCurrentWalletRecord()
        // TODO: manage brands by object identity #10167
        .purses.find(p => p.brand.toString().includes('Invitation'));
      // @ts-expect-error
      const invitation = purse?.balance.value.find(
        v => v.description === 'oracle invitation',
      );
      return invitation;
    },
  }));

  const ensureInvitationsAccepted = async () => {
    if (invitationsAccepted) {
      return;
    }
    await null;
    for (const member of ecMembers) {
      await member.acceptOutstandingCharterInvitation();
      await member.acceptOutstandingCommitteeInvitation();
    }
    invitationsAccepted = true;
  };

  const proposeParams = async (
    instance,
    params,
    path,
    ecMember: (typeof ecMembers)[0] | null = null,
    questionId = 'propose',
    charterOfferId = charterMembershipId,
  ) => {
    const now = await EV(chainTimerService).getCurrentTimestamp();

    await (ecMember || ecMembers[0]).executeOffer({
      id: questionId,
      invitationSpec: {
        invitationMakerName: 'VoteOnParamChange',
        previousOffer: charterOfferId,
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

  const proposeApiCall = async (
    instance,
    methodName: string,
    methodArgs: any[],
    ecMember: (typeof ecMembers)[0] | null = null,
    questionId = 'propose',
    charterOfferId = charterMembershipId,
  ) => {
    const now = await EV(chainTimerService).getCurrentTimestamp();
    const deadline = SECONDS_PER_MINUTE + now.absValue;
    await (ecMember || ecMembers[0]).executeOffer({
      id: questionId,
      invitationSpec: {
        invitationMakerName: 'VoteOnApiCall',
        previousOffer: charterOfferId,
        source: 'continuing',
        invitationArgs: [instance, methodName, methodArgs, deadline],
      },
      proposal: {},
    });
  };

  const enactLatestProposal = async (
    members = ecMembers,
    voteId = 'voteInNewLimit',
    committeeId = committeeMembershipId,
  ) => {
    const promises = members.map(member =>
      member.voteOnLatestProposal(voteId, committeeId),
    );
    await Promise.all(promises);
  };

  const getLatestOutcome = () =>
    testKit.readPublished('committees.Economic_Committee.latestOutcome');

  return {
    proposeParams,
    proposeApiCall,
    enactLatestProposal,
    getLatestOutcome,
    async changeParams(instance: Instance, params: object, path?: object) {
      instance || Fail`missing instance`;
      await ensureInvitationsAccepted();
      await proposeParams(instance, params, path);
      await enactLatestProposal();
      await testKit.advanceTimeBy(1, 'minutes');
    },
    ecMembers,
  };
};
harden(makeGovernanceDriver);
export type GovernanceDriver = Awaited<ReturnType<typeof makeGovernanceDriver>>;

export const makeZoeDriver = async (testKit: SwingsetTestKit) => {
  const { EV } = testKit.runUtils;
  const zoe = await EV.vat('bootstrap').consumeItem('zoe');
  const chainStorage = await EV.vat('bootstrap').consumeItem('chainStorage');
  const storageNode = await EV(chainStorage!).makeChildNode('prober-asid9a');
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
harden(makeZoeDriver);
export type ZoeDriver = Awaited<ReturnType<typeof makeZoeDriver>>;
