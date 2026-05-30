/** @file invoke a saved ymax0 allocation delegation to set target allocation */
import { mustMatch, type TypedPattern } from '@agoric/internal';
import type { PortfolioSyncState, StatusFor } from '@agoric/portfolio-api';
import type { PortfolioDelegationClient } from '@aglocal/portfolio-contract/src/delegation.exo.ts';
import { TargetAllocationShapeExt } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { parseArgs } from 'node:util';
import type { RunTools } from './wallet-admin-types.ts';

const options = {
  'delegation-key': { type: 'string' },
  'portfolio-id': { type: 'string' },
  'allocations-file': { type: 'string' },
  'policy-version': { type: 'string' },
  'rebalance-count': { type: 'string' },
} as const;

const usage = `Usage:
  ./packages/portfolio-deploy/scripts/wallet-admin.ts \
  ./packages/portfolio-deploy/src/delegated-set-target-allocation.ts \
  --portfolio-id N \
  --delegation-key delegate-portfolioN \
  --allocations-file ./allocations-portfolioN.json

Notes:
  - This delegated tool is scoped to mainnet ymax0 allocation updates only.
  - The allocation file must preserve the portfolio's current instrument key set.
  - policyVersion and rebalanceCount are read automatically unless both are provided.
`;

const parseIntArg = (raw: string, label: string) => {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw Error(`${label} must be a non-negative integer: ${raw}`);
  }
  return value;
};

const failUsage = (message: string): never => {
  throw Error(`${usage}\n${message}`);
};

const requireOption = (value: string | undefined, label: string): string => {
  return value ?? failUsage(`${label} missing`);
};

const parseTypedJSON = <T>(
  json: string,
  shape: TypedPattern<T>,
  reviver?: (k, v) => unknown,
  makeError: (err) => unknown = err => err,
): T => {
  let result: unknown;
  try {
    result = harden(JSON.parse(json, reviver));
    mustMatch(result, shape);
  } catch (err) {
    throw makeError(err);
  }
  return result;
};

const getSyncState = async (
  walletKit: RunTools['walletKit'],
  portfolioId: number,
  values: {
    'policy-version'?: string;
    'rebalance-count'?: string;
  },
): Promise<PortfolioSyncState> => {
  const { 'policy-version': rawPolicyVersion, 'rebalance-count': rawCount } =
    values;
  if (!!rawPolicyVersion !== !!rawCount) {
    throw Error(
      '--policy-version and --rebalance-count must be provided together',
    );
  }
  if (rawPolicyVersion && rawCount) {
    return harden({
      policyVersion: parseIntArg(rawPolicyVersion, '--policy-version'),
      rebalanceCount: parseIntArg(rawCount, '--rebalance-count'),
    });
  }
  await null;
  const status = (await walletKit.readPublished(
    `ymax0.portfolios.portfolio${portfolioId}`,
  )) as StatusFor['portfolio'];
  return harden({
    policyVersion: status.policyVersion,
    rebalanceCount: status.rebalanceCount,
  });
};

const delegatedSetTargetAllocation = async ({
  scriptArgs,
  makeAccount,
  walletKit,
  cwd,
}: RunTools) => {
  const { values } = parseArgs({ args: scriptArgs, options });
  const {
    'delegation-key': delegationKey,
    'portfolio-id': rawPortfolioId,
    'allocations-file': allocationsFile,
  } = values;

  const actualDelegationKey = requireOption(delegationKey, '--delegation-key');
  const actualPortfolioId = requireOption(rawPortfolioId, '--portfolio-id');
  const actualAllocationsFile = requireOption(
    allocationsFile,
    '--allocations-file',
  );

  const portfolioId = parseIntArg(actualPortfolioId, '--portfolio-id');
  const rawAlloc = await cwd.join(actualAllocationsFile).readOnly().readText();
  const targetAllocation = parseTypedJSON(
    rawAlloc,
    TargetAllocationShapeExt,
    (_k, v) => (typeof v === 'number' ? BigInt(v) : v),
    err =>
      failUsage(
        `Invalid target allocation JSON: ${err instanceof Error ? err.message : String(err)}`,
      ),
  );
  const account = await makeAccount('MNEMONIC');
  const syncState = await getSyncState(walletKit, portfolioId, values);
  const delegate =
    account.store.get<PortfolioDelegationClient>(actualDelegationKey);
  const { id, tx, invocationResult } = await delegate.setTargetAllocation(
    targetAllocation,
    syncState,
  );

  if (tx.code !== 0) {
    throw Error(`invokeEntry failed (${tx.code}): ${tx.rawLog}`);
  }

  console.log(
    JSON.stringify(
      {
        id,
        status: 'submitted',
        delegationScope: 'setTargetAllocation',
        flowId: invocationResult,
        txHash: tx.transactionHash,
        height: tx.height,
        address: account.address,
        contract: 'ymax0',
        delegationKey: actualDelegationKey,
        portfolioId,
        allocationsFile: actualAllocationsFile,
        syncState,
      },
      null,
      2,
    ),
  );
};

export default delegatedSetTargetAllocation;
