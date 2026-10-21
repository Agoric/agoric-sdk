import { type Amount } from '@agoric/ertp';
import {
  boardSlottingMarshaller,
  unmarshalFromVstorage,
} from '@agoric/internal/src/marshal/board-client-utils.js';
import {
  slotToRemotable,
  type FakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import { Fail } from '@endo/errors';

import type {
  InvokeEntryMessage,
  OfferSpec,
} from '@agoric/smart-wallet/src/offers.js';
import type {
  BridgeAction,
  CurrentWalletRecord,
  SmartWallet,
  UpdateRecord,
} from '@agoric/smart-wallet/src/smartWallet.js';
import type { OfferMaker } from '@agoric/smart-wallet/src/types.js';
import type { RunUtils } from '@agoric/swingset-vat/tools/run-utils.js';
import type { TimerService } from '@agoric/time';
import type { WalletFactoryStartResult } from '@agoric/vats/src/core/startWalletFactory.js';
import { type AgoricNamesRemotes } from '@agoric/vats/tools/board-utils.js';
import type { Instance, InvitationDetails } from '@agoric/zoe';
import type { Marshal } from '@endo/marshal';
import type { ERef } from '@agoric/vow';
import type { BankManager } from '@agoric/vats/src/vat-bank.js';
import type { SwingsetTestKit } from './supports.js';

type Marshaller = Omit<Marshal<string | null>, 'serialize' | 'unserialize'>;

// Formerly imported from inter-protocol's econ-behaviors (refs #12719).
const SECONDS_PER_MINUTE = 60n;

const isBootProfileEnabled = () => {
  const value = process.env.AGORIC_BOOT_TEST_PROFILE;
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized !== '0' && normalized !== 'false' && normalized !== 'off';
};

const profileBootStep = async <T>(
  label: string,
  op: () => Promise<T>,
): Promise<T> => {
  const start = performance.now();
  try {
    // eslint-disable-next-line @jessie.js/safe-await-separator
    return await op();
  } finally {
    if (isBootProfileEnabled()) {
      console.warn(`${label}=${(performance.now() - start).toFixed(1)}ms`);
    }
  }
};

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

  const marshaller: Marshaller = boardSlottingMarshaller(slotToRemotable);

  const makeWalletDriver = (
    walletAddress: string,
    walletPresence: SmartWallet,
    isNew: boolean,
    myMarshaller = marshaller,
  ) => ({
    isNew,
    getAddress: () => walletAddress,

    invokeEntry(message: InvokeEntryMessage): Promise<void> {
      const action: BridgeAction = harden({
        method: 'invokeEntry',
        message,
      });
      const offerCapData = marshaller.toCapData(action);
      return EV(walletPresence).handleBridgeAction(offerCapData, false);
    },
    executeOffer(offer: OfferSpec): Promise<void> {
      const offerCapData = myMarshaller.toCapData(
        harden({
          method: 'executeOffer',
          offer,
        }),
      );
      return EV(walletPresence).handleBridgeAction(offerCapData, true);
    },
    sendOffer(offer: OfferSpec): Promise<void> {
      const offerCapData = myMarshaller.toCapData(
        harden({
          method: 'executeOffer',
          offer,
        }),
      );

      return EV.sendOnly(walletPresence).handleBridgeAction(offerCapData, true);
    },
    tryExitOffer(offerId: string) {
      const capData = myMarshaller.toCapData(
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
        (...args) =>
          Reflect.apply(myMarshaller.fromCapData, myMarshaller, args),
        -1,
      ) as any;
    },

    getLatestUpdateRecord(): UpdateRecord {
      return unmarshalFromVstorage(
        storage.data,
        `published.wallet.${walletAddress}`,
        (...args) =>
          Reflect.apply(myMarshaller.fromCapData, myMarshaller, args),
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
      myMarshaller?: Marshaller,
    ): Promise<ReturnType<typeof makeWalletDriver>> {
      const bank = await profileBootStep(
        `walletFactoryDriver.getBankForAddress.${walletAddress}`,
        () => EV(bankManager).getBankForAddress(walletAddress),
      );
      return profileBootStep(
        `walletFactoryDriver.provideSmartWallet.${walletAddress}`,
        () =>
          EV(walletFactoryStartResult.creatorFacet).provideSmartWallet(
            walletAddress,
            bank,
            namesByAddressAdmin,
          ),
      ).then(([walletPresence, isNew]) =>
        makeWalletDriver(walletAddress, walletPresence, isNew, myMarshaller),
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

export const makeGovernanceDriver = async (
  testKit: SwingsetTestKit,
  agoricNamesRemotes: AgoricNamesRemotes,
  walletFactoryDriver: WalletFactoryDriver,
  committeeAddresses: string[],
) => {
  const { EV } = testKit.runUtils;
  const charterMembershipId = 'charterMembership';
  const committeeMembershipId = 'committeeMembership';

  const chainTimerService: ERef<TimerService> =
    await EV.vat('bootstrap').consumeItem('chainTimerService');

  let invitationsAccepted = false;

  const smartWallets = await Promise.all(
    committeeAddresses.map(address =>
      walletFactoryDriver.provideSmartWallet(address),
    ),
  );

  const findInvitation = (
    wallet: SmartWalletDriver,
    descriptionSubstr: string,
  ) => {
    const invitationBalance = wallet.getCurrentWalletRecord().purses[0]
      .balance as Amount<'set', InvitationDetails>;
    return invitationBalance.value.find(v =>
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
      const invBalance = purse?.balance as Amount<'set', InvitationDetails>;
      const invitation = invBalance.value.find(
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
