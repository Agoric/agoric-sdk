import {
  makeAgoricNames,
  type SmartWalletKit,
  type VstorageKit,
} from '@agoric/client-utils';
import type { SigningStargateClient } from '@cosmjs/stargate';
import type { ExecuteOfferAction } from '@agoric/smart-wallet/src/smartWallet.js';
import { submitAction } from './swingset-tx.ts';

type SubmitOfferParams = {
  walletKit: SmartWalletKit;
  stargateClient: SigningStargateClient;
  address: string;
  vstorageKit: VstorageKit;
  offerArgs?: object;
  proposal?: object;
};

export const resolveSubscription = async ({
  offerArgs = {},
  proposal = {},
  walletKit,
  stargateClient,
  address,
  vstorageKit,
}: SubmitOfferParams) => {
  const { fromBoard, vstorage } = vstorageKit;
  const { instance } = await makeAgoricNames(fromBoard, vstorage);

  const action: ExecuteOfferAction = harden({
    method: 'executeOffer',
    offer: {
      id: `offer-${Date.now()}`,
      invitationSpec: {
        // TODO: UNTIL https://github.com/Agoric/agoric-sdk/issues/11709
        // Updates vstorage on the chain by making an offer to the `resolverMock` contract on devnet.
        publicInvitationMaker: 'vPusherInvitation',
        source: 'contract',
        // TODO: UNTIL https://github.com/Agoric/agoric-sdk/issues/11709
        instance: instance['resolverMock'],
      },
      offerArgs: { ...offerArgs },
      proposal,
    },
  });

  const result = await submitAction(action, {
    address,
    stargateClient,
    walletKit,
    skipPoll: true,
  });

  return result;
};
