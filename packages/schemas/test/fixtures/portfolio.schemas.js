import { z } from 'zod';
import { Mz } from '../../src/index.js';

export const NatAmountSchema = z
  .object({
    brand: Mz.remotable('Brand'),
    value: Mz.gte(0n),
  })
  .strict();

const PoolKeySchema = z.enum([
  'USDN',
  'Aave_Avalanche',
  'Compound_Base',
]);

export const TargetAllocationSchema = z
  .record(PoolKeySchema, Mz.nat())
  .describe('PoolKey to target portions.');

export const TargetAllocationExtSchema = z.record(z.string(), Mz.nat());

export const FlowDetailSchema = z.union([
  z
    .object({
      type: z.literal('withdraw'),
      amount: NatAmountSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('other'),
    })
    .strict(),
]);

export const FlowStatusSchema = z.union([
  z.object({ state: z.literal('run'), step: z.number(), how: z.string() }).strict(),
  z.object({ state: z.literal('undo'), step: z.number(), how: z.string() }).strict(),
  z.object({ state: z.literal('done') }).strict(),
  z
    .object({
      state: z.literal('fail'),
      step: z.number(),
      how: z.string(),
      error: z.string(),
      where: z.string().optional(),
    })
    .strict(),
]);

export const FlowStepsSchema = z.array(
  z
    .object({
      how: z.string(),
      amount: NatAmountSchema,
      src: z.object({ address: z.string() }).strict(),
      dest: z.object({ address: z.string() }).strict(),
    })
    .strict(),
);

export const PortfolioStatusSchema = z
  .object({
    positionKeys: z.array(z.string()),
    flowCount: z.number(),
    accountIdByChain: z.record(z.string(), z.string()),
    policyVersion: z.number(),
    rebalanceCount: z.number(),
    depositAddress: z.string().optional(),
    targetAllocation: TargetAllocationExtSchema.optional(),
    accountsPending: z.array(z.string()).optional(),
    flowsRunning: z.record(z.string(), FlowDetailSchema).optional(),
  })
  .strict();

export const PositionStatusSchema = z
  .object({
    protocol: z.enum(['Aave', 'USDN', 'Beefy']),
    accountId: z.string(),
    netTransfers: NatAmountSchema,
    totalIn: NatAmountSchema,
    totalOut: NatAmountSchema,
  })
  .strict();
