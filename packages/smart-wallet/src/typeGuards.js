// @ts-check

import { M } from '@agoric/store';
import {
  InstanceHandleShape,
  ProposalShape,
} from '@agoric/zoe/src/typeGuards.js';

export const shape = {
  // smartWallet
  StringCapData: {
    body: M.string(),
    slots: M.arrayOf(M.string()),
  },

  // invitations
  ContractInvitationSpec: M.split(
    {
      source: 'contract',
      instance: InstanceHandleShape,
      publicInvitationMaker: M.string(),
    },
    M.partial({
      invitationArgs: M.array(),
    }),
  ),
  ContinuingInvitationSpec: M.split(
    {
      source: 'continuing',
      previousOffer: M.number(),
      invitationMakerName: M.string(),
    },
    M.partial({
      invitationArgs: M.array(),
    }),
  ),
  PurseInvitationSpec: {
    source: 'purse',
    instance: InstanceHandleShape,
    description: M.string(),
  },

  // offers
  OfferSpec: M.split(
    {
      id: M.number(),
      // TODO M.unknown() to defer validation
      invitationSpec: M.any(),
      proposal: ProposalShape,
    },
    M.partial({ offerArgs: M.any() }),
  ),

  // walletFactory
  WalletBridgeMsg: M.split(
    {
      owner: M.string(),
      type: M.string(),
      blockHeight: M.number(),
      blockTime: M.number(),
    },
    M.or({ action: M.string() }, { spendAction: M.string() }),
  ),
};
harden(shape);
