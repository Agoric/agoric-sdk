import { z } from 'zod';
import { Mz } from '../../src/index.js';

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

const ContractInvitationArgsSchema = z.object({
  source: z.literal('contract'),
  instance: Mz.remotable('InstanceHandle'),
  publicInvitationMaker: z.string(),
  invitationArgs: z.array(z.any()).optional(),
});

export const ContractInvitationSpecSchema = ContractInvitationArgsSchema.strict();

const ContinuingInvitationArgsSchema = z.object({
  source: z.literal('continuing'),
  previousOffer: IdSchema,
  invitationMakerName: z.string(),
  invitationArgs: z.array(z.any()).optional(),
});

export const ContinuingInvitationSpecSchema = ContinuingInvitationArgsSchema.strict();

export const AgoricContractInvitationSpecSchema = z
  .object({
    source: z.literal('agoricContract'),
    instancePath: z.array(z.string()),
    callPipe: z.array(
      z
        .tuple([z.string(), z.array(z.any()).optional()])
        .describe('Pipe entry'),
    ),
  })
  .strict();

export const OfferSpecSchema = z
  .object({
    id: IdSchema,
    invitationSpec: z.any(),
    proposal: z.any(),
    offerArgs: z.any().optional(),
    saveResult: ResultPlanSchema.optional(),
  })
  .strict();

const WalletActionFields = {
  blockHeight: z.number(),
  blockTime: z.number(),
  owner: z.string(),
};

export const WalletActionMsgSchema = z
  .object({
    type: z.literal('WALLET_ACTION'),
    action: z.string(),
    ...WalletActionFields,
  })
  .strict();

export const WalletSpendActionMsgSchema = z
  .object({
    type: z.literal('WALLET_SPEND_ACTION'),
    spendAction: z.string(),
    ...WalletActionFields,
  })
  .strict();

export const WalletBridgeMsgSchema = z.union([
  WalletActionMsgSchema,
  WalletSpendActionMsgSchema,
]);

export const ShapeSchema = z.object({
  StringCapData: StringCapDataSchema,
  AgoricContractInvitationSpec: AgoricContractInvitationSpecSchema,
  ContractInvitationSpec: ContractInvitationSpecSchema,
  ContinuingInvitationSpec: ContinuingInvitationSpecSchema,
  PurseInvitationSpec: z
    .object({
      source: z.literal('purse'),
      instance: Mz.remotable('InstanceHandle'),
      description: z.string(),
    })
    .strict(),
  OfferSpec: OfferSpecSchema,
  ResultPlan: ResultPlanSchema,
  InvokeEntryMessage: InvokeEntryMessageSchema,
  WalletActionMsg: WalletActionMsgSchema,
  WalletSpendActionMsg: WalletSpendActionMsgSchema,
  WalletBridgeMsg: WalletBridgeMsgSchema,
}).strict();
