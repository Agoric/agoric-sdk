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
  AgoricContractInvitationSpec: {
    source: 'agoricContract',
    instancePath: M.arrayOf(M.string()),
    callPipe: M.arrayOf(M.splitArray([M.string()], [M.arrayOf(M.any())])),
  },
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
  /**
   * Defined by walletAction struct in msg_server.go
   *
   * @see walletAction in msg_server.go
   */
  WalletActionMsg: M.splitRecord({
    type: 'WALLET_ACTION',
    action: M.string(),

    blockHeight: M.number(),
    blockTime: M.number(),
    owner: M.string(),
  }),

  /**
   * Defined by walletAction struct in msg_server.go
   *
   * @see walletSpendAction in msg_server.go
   */
  WalletSpendActionMsg: M.splitRecord({
    type: 'WALLET_SPEND_ACTION',
    spendAction: M.string(),

    blockHeight: M.number(),
    blockTime: M.number(),
    owner: M.string(),
  }),
};
shape.WalletBridgeMsg = M.or(shape.WalletActionMsg, shape.WalletSpendActionMsg);
harden(shape);
