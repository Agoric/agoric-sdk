import { type SigningSmartWalletKit } from '@agoric/client-utils';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers';
import type { CctpSubscription, GmpSubscription,  } from './subscription-manager.js';

type ResolveCCTPSubscriptionParams = {
  signingSmartWalletKit: SigningSmartWalletKit;
  subscriptionId: string;
  status: 'success' | 'timeout';
  subscriptionData: CctpSubscription;
  previousOfferId: string;
  proposal?: object;
};

type ResolveGMPSubscriptionParams = {
  signingSmartWalletKit: SigningSmartWalletKit;
  subscriptionId: string;
  status: 'success' | 'timeout';
  subscriptionData: GmpSubscription;
  previousOfferId: string;
  proposal?: object;
};

export const resolveCCTPSubscription = async ({
  signingSmartWalletKit,
  subscriptionId,
  status,
  subscriptionData,
  previousOfferId,
  proposal = {},
}: ResolveCCTPSubscriptionParams) => {

  if (status === 'timeout') {
    console.log('timeout is not implemented yet in contract');
    return;
  }

  if (subscriptionData.type !== 'cctp') {
    throw new Error(`Expected subscription type to be 'cctp', got ${subscriptionData.type}`);
  }
  const [chainId, chainName, contractAddress] = subscriptionData.destinationAddress.split(':');
  const action: OfferSpec = harden({
    id: `offer-${Date.now()}`,
    invitationSpec: {      
      source: 'continuing',
      previousOffer: previousOfferId,
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
  previousOfferId,
  proposal = {},
}: ResolveGMPSubscriptionParams) => {

  throw new Error('GMP subscription resolution is not implemented yet');
};

