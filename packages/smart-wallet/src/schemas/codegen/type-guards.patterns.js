// Generated from ../type-guards.schemas.js by @agoric/schemas
import { M } from '@endo/patterns';

export const AgoricContractInvitationSpec = M.splitRecord({
  source: "agoricContract",
  instancePath: M.arrayOf(M.string()),
  callPipe: M.arrayOf(M.splitArray([M.string()], [M.arrayOf(M.any())]))
}, {}, {});
harden(AgoricContractInvitationSpec);

export const ContinuingInvitationSpec = M.splitRecord({
  source: "continuing",
  previousOffer: M.or(M.string(), M.number()),
  invitationMakerName: M.string()
}, {
  invitationArgs: M.arrayOf(M.any())
}, {});
harden(ContinuingInvitationSpec);

export const ContractInvitationSpec = M.splitRecord({
  source: "contract",
  instance: M.remotable("InstanceHandle"),
  publicInvitationMaker: M.string()
}, {
  invitationArgs: M.arrayOf(M.any())
}, {});
harden(ContractInvitationSpec);

export const InvokeEntryMessage = M.splitRecord({
  targetName: M.string(),
  method: M.string(),
  args: M.arrayOf(M.any())
}, {
  /**
   * If present, save the result of this invocation with this key.
   */
  saveResult: M.splitRecord({
    name: M.string()
  }, {
    overwrite: M.boolean()
  }, {}),
  id: M.or(M.string(), M.number())
}, {});
harden(InvokeEntryMessage);

export const PurseInvitationSpec = M.splitRecord({
  source: "purse",
  instance: M.remotable("InstanceHandle"),
  description: M.string()
}, {}, {});
harden(PurseInvitationSpec);

/**
 * Planner result persistence directive.
 */
export const ResultPlan = M.splitRecord({
  name: M.string()
}, {
  overwrite: M.boolean()
}, {});
harden(ResultPlan);

export const StringCapData = M.splitRecord({
  body: M.string(),
  slots: M.arrayOf(M.string())
}, {}, {});
harden(StringCapData);

/**
 * Defined by walletAction struct in msg_server.go
 * 
 * @see {agoric.swingset.MsgWalletAction} and walletSpendAction in msg_server.go
 */
export const WalletActionMsg = M.splitRecord({
  type: "WALLET_ACTION",
  /**
   * JSON of marshalled BridgeAction
   */
  action: M.string(),
  blockHeight: M.bigint(),
  blockTime: M.bigint(),
  /**
   * base64 of Uint8Array of bech32 data
   */
  owner: M.string()
}, {}, {});
harden(WalletActionMsg);

/**
 * Messages transmitted over Cosmos chain, cryptographically verifying that the message came from the 'owner'.
 * 
 * The two wallet actions are distinguished by whether the user had to confirm the sending of the message (as is the case for WALLET_SPEND_ACTION).
 */
export const WalletBridgeMsg = M.or(M.splitRecord({
  type: "WALLET_ACTION",
  /**
   * JSON of marshalled BridgeAction
   */
  action: M.string(),
  blockHeight: M.bigint(),
  blockTime: M.bigint(),
  /**
   * base64 of Uint8Array of bech32 data
   */
  owner: M.string()
}, {}, {}), M.splitRecord({
  type: "WALLET_SPEND_ACTION",
  /**
   * JSON of BridgeActionCapData
   */
  spendAction: M.string(),
  blockHeight: M.bigint(),
  blockTime: M.bigint(),
  /**
   * base64 of Uint8Array of bech32 data
   */
  owner: M.string()
}, {}, {}));
harden(WalletBridgeMsg);

export const WalletSpendActionMsg = M.splitRecord({
  type: "WALLET_SPEND_ACTION",
  /**
   * JSON of BridgeActionCapData
   */
  spendAction: M.string(),
  blockHeight: M.bigint(),
  blockTime: M.bigint(),
  /**
   * base64 of Uint8Array of bech32 data
   */
  owner: M.string()
}, {}, {});
harden(WalletSpendActionMsg);
