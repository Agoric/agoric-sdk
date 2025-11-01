import { z } from 'zod';
import { Mz } from '@agoric/schemas';

const IdSchema = z.union([z.string(), z.number()]);

export const ResultPlanSchema = z
  .object({
    name: z.string(),
    overwrite: z.boolean().optional(),
  })
  .strict()
  .describe('Planner result persistence directive.');

export const InvokeEntryMessageSchema = z
  .object({
    targetName: z.string(),
    method: z.string(),
    args: z.array(z.any()),
    saveResult: ResultPlanSchema.optional().describe(
      'If present, save the result of this invocation with this key.',
    ),
    id: IdSchema.optional(),
  })
  .strict();

export const StringCapDataSchema = z
  .object({
    body: z.string(),
    slots: z.array(z.string()),
  })
  .strict();

export const AgoricContractInvitationSpecSchema = z
  .object({
    source: z.literal('agoricContract'),
    instancePath: z.array(z.string()),
    callPipe: z.array(
      z.tuple([z.string(), z.array(z.any()).optional()]).describe('Pipe entry'),
    ),
  })
  .strict();

export const ContractInvitationSpecSchema = z
  .object({
    source: z.literal('contract'),
    instance: Mz.remotable('InstanceHandle'),
    publicInvitationMaker: z.string(),
    invitationArgs: z.array(z.any()).optional(),
  })
  .strict();

export const ContinuingInvitationSpecSchema = z
  .object({
    source: z.literal('continuing'),
    previousOffer: IdSchema,
    invitationMakerName: z.string(),
    invitationArgs: z.array(z.any()).optional(),
  })
  .strict();

export const PurseInvitationSpecSchema = z
  .object({
    source: z.literal('purse'),
    instance: Mz.remotable('InstanceHandle'),
    description: z.string(),
  })
  .strict();

const WalletActionFields = {
  blockHeight: z.bigint(),
  blockTime: z.bigint(),
  owner: z.string().describe('base64 of Uint8Array of bech32 data'),
};

export const WalletActionMsgSchema = z
  .object({
    type: z.literal('WALLET_ACTION'),
    action: z.string().describe('JSON of marshalled BridgeAction'),
    ...WalletActionFields,
  })
  .strict().describe(`Defined by walletAction struct in msg_server.go

@see {agoric.swingset.MsgWalletAction} and walletSpendAction in msg_server.go`);

export const WalletSpendActionMsgSchema = z
  .object({
    type: z.literal('WALLET_SPEND_ACTION'),
    spendAction: z.string().describe('JSON of BridgeActionCapData'),
    ...WalletActionFields,
  })
  .strict();

export const WalletBridgeMsgSchema = z
  .union([WalletActionMsgSchema, WalletSpendActionMsgSchema])
  .describe(
    `Messages transmitted over Cosmos chain, cryptographically verifying that the message came from the 'owner'.

The two wallet actions are distinguished by whether the user had to confirm the sending of the message (as is the case for WALLET_SPEND_ACTION).`,
  );
