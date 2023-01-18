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
  ContractInvitationSpec: M.splitRecord(
    {
      source: 'contract',
      instance: InstanceHandleShape,
      publicInvitationMaker: M.string(),
    },
    {
      invitationArgs: M.array(),
    },
  ),
  ContinuingInvitationSpec: M.splitRecord(
    {
      source: 'continuing',
      previousOffer: M.or(M.number(), M.string()),
      invitationMakerName: M.string(),
    },
    {
      invitationArgs: M.array(),
    },
  ),
  PurseInvitationSpec: {
    source: 'purse',
    instance: InstanceHandleShape,
    description: M.string(),
  },

  // offers
  OfferSpec: M.splitRecord(
    {
      id: M.or(M.number(), M.string()),
      // TODO M.unknown() to defer validation
      invitationSpec: M.any(),
      proposal: ProposalShape,
    },
    { offerArgs: M.any() },
  ),

  // walletFactory
  WalletBridgeMsg: M.splitRecord(
    {
      owner: M.string(),
      type: M.string(),
      blockHeight: M.number(),
      blockTime: M.number(),
    },
    {},
    M.or(
      { action: M.string() },
      { spendAction: M.string() },
      { oracleAction: M.string() },
    ),
  ),
};
harden(shape);
