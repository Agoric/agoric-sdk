import { M } from '@agoric/store';
import { ProposalShape } from '@agoric/zoe/src/typeGuards.js';
import {
  AgoricContractInvitationSpec as AgoricContractInvitationSpecPattern,
  ContractInvitationSpec as ContractInvitationSpecPattern,
  ContinuingInvitationSpec as ContinuingInvitationSpecPattern,
  InvokeEntryMessage,
  PurseInvitationSpec as PurseInvitationSpecPattern,
  ResultPlan,
  StringCapData as StringCapDataPattern,
  WalletActionMsg as WalletActionMsgPattern,
  WalletBridgeMsg as WalletBridgeMsgPattern,
  WalletSpendActionMsg as WalletSpendActionMsgPattern,
} from './schemas/codegen/type-guards.patterns.js';

export const shape = {
  // smartWallet
  StringCapData: StringCapDataPattern,

  // invitations
  AgoricContractInvitationSpec: AgoricContractInvitationSpecPattern,
  ContractInvitationSpec: ContractInvitationSpecPattern,
  ContinuingInvitationSpec: ContinuingInvitationSpecPattern,
  PurseInvitationSpec: PurseInvitationSpecPattern,

  // offers
  OfferSpec: M.splitRecord(
    {
      id: M.or(M.number(), M.string()),
      // TODO M.unknown() to defer validation
      invitationSpec: M.any(),
      proposal: ProposalShape,
    },
    {
      offerArgs: M.any(),
      saveResult: ResultPlan,
    },
    {},
  ),
  ResultPlan,
  InvokeEntryMessage,

  // walletFactory
  /**
   * Defined by walletAction struct in msg_server.go
   *
   * @see walletAction in msg_server.go
   */
  WalletActionMsg: WalletActionMsgPattern,

  /**
   * Defined by walletAction struct in msg_server.go
   *
   * @see walletSpendAction in msg_server.go
   */
  WalletSpendActionMsg: WalletSpendActionMsgPattern,
  WalletBridgeMsg: WalletBridgeMsgPattern,
};
harden(shape);
