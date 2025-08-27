import { type SigningSmartWalletKit } from '@agoric/client-utils';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers';
import { Fail } from '@endo/errors';
import type {
  CctpSubscription,
  GmpSubscription,
} from './subscription-manager.js';

type ResolveSubscriptionParams = {
  signingSmartWalletKit: SigningSmartWalletKit;
  subscriptionId: string;
  status: 'success' | 'timeout';
  subscriptionData: CctpSubscription;
  proposal?: object;
};

const getInvitationMakers = async (wallet: SigningSmartWalletKit) => {
  const getCurrentWalletRecord = await wallet.query.getCurrentWalletRecord();
  const invitation = getCurrentWalletRecord.offerToUsedInvitation.find(
    inv => inv[1].value[0].description === 'resolver',
  );
  if (!invitation) {
    throw new Error('No invitation makers found');
  }
  return invitation;
};

export const resolveCCTPSubscription = async ({
  signingSmartWalletKit,
  subscriptionId,
  status,
  subscriptionData,
  proposal = {},
}: ResolveSubscriptionParams) => {
  subscriptionData.type === 'cctp' ||
    Fail`Expected subscription type to be 'cctp', got ${subscriptionData.type}`;
  if (status === 'timeout') {
    throw new Error('TODO: timeout is not implemented yet in contract');
  }

  const invitationMakersOffer = await getInvitationMakers(
    signingSmartWalletKit,
  );

  const [chainId, chainName, contractAddress] =
    subscriptionData.destinationAddress.split(':');
  const action: OfferSpec = harden({
    id: `offer-${Date.now()}`,
    invitationSpec: {
      source: 'continuing',
      previousOffer: invitationMakersOffer[0],
      invitationMakerName: 'SettleCCTPTransaction',
    },
    offerArgs: {
      txDetails: {
        amount: subscriptionData.amount,
        remoteAddress: contractAddress,
        status,
      },
      remoteAxelarChain: `${chainId}:${chainName}`,
      txId: subscriptionId,
    },
    proposal,
  });

  const result = await signingSmartWalletKit.executeOffer(action);
  return result;
};

export const resolveGMPSubscription = async ({
  signingSmartWalletKit,
  subscriptionId,
  status,
  subscriptionData,
  proposal = {},
}: ResolveSubscriptionParams) => {
  throw new Error('TODO: GMP subscription resolution is not implemented yet');
};
