// @ts-check
/* eslint-env node */
import { fetchEnvNetworkConfig, makeVstorageKit } from '@agoric/client-utils';
import { readPortfolioHistoryEntries } from '@agoric/portfolio-api';
import { Command } from 'commander';

const networkConfig = await fetchEnvNetworkConfig({ env: process.env, fetch });

const decodeCapDataValue = marshaller => value => {
  if (
    value &&
    typeof value === 'object' &&
    'body' in value &&
    'slots' in value
  ) {
    return marshaller.fromCapData(value);
  }
  if (typeof value === 'string') {
    return marshaller.fromCapData(JSON.parse(value));
  }
  return value;
};

const formatFlowsRunning = flowsRunning => {
  const entries = Object.entries(flowsRunning || {});
  if (!entries.length) return 'none';
  return entries
    .map(([key, detail]) =>
      detail && 'type' in detail ? `${key}:${detail.type}` : key,
    )
    .join(', ');
};

const describePortfolioStatus = status =>
  `policy=${status.policyVersion} rebalance=${status.rebalanceCount} positionKeys=${status.positionKeys.length} flowsRunning=${formatFlowsRunning(status.flowsRunning)}`;

const toBigIntValue = amount => {
  if (!amount || typeof amount !== 'object') return undefined;
  const raw = amount.value;
  if (typeof raw === 'bigint') return raw;
  if (typeof raw === 'number') return BigInt(raw);
  if (typeof raw === 'string') {
    try {
      return BigInt(raw);
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const describeFlowEvent = (entry, costBasis) => {
  const { value } = entry;
  const detailType = value.type || entry.detail?.type;
  const amountValue =
    toBigIntValue(value.amount || entry.detail?.amount) ?? 0n;
  const { state } = value;
  const step = 'step' in value ? value.step : undefined;
  const how = 'how' in value ? value.how : undefined;
  const parts = [
    `state=${state}`,
    detailType ? `type=${detailType}` : undefined,
    step !== undefined ? `step=${step}` : undefined,
    how ? `how=${how}` : undefined,
    amountValue ? `amount=${amountValue}` : undefined,
  ].filter(Boolean);
  let delta = 0n;
  if (amountValue) {
    if (detailType === 'deposit') delta = amountValue;
    else if (detailType === 'withdraw') delta = -amountValue;
  }
  const nextBasis = costBasis + delta;
  return { summary: parts.join(' '), delta, nextBasis };
};

const describePositionStatus = (poolKey, value) => {
  const totalIn = toBigIntValue(value.totalIn) ?? 0n;
  const totalOut = toBigIntValue(value.totalOut) ?? 0n;
  const net = totalIn - totalOut;
  return { summary: `position=${poolKey} totalIn=${totalIn} totalOut=${totalOut} net=${net}`, totals: { totalIn, totalOut } };
};

export const makePortfolioCommand = (io = {}) => {
  const { stdout = process.stdout } = io;
  const portfolio = new Command('portfolio').description(
    'Portfolio contract utilities',
  );

  portfolio
    .command('history')
    .description('Print portfolio + flow vstorage history')
    .option('--instance <string>', 'contract instance name (default ymax1)', 'ymax1')
    .requiredOption('--id <number>', 'portfolio numeric ID', Number)
    .option('--limit <number>', 'limit entries (oldest first)', Number)
    .option('--desc', 'show newest first')
    .action(async ({ instance, id, limit, desc }) => {
      const vsk = makeVstorageKit({ fetch }, networkConfig);
      const decodeValue = decodeCapDataValue(vsk.marshaller);
      const history = await readPortfolioHistoryEntries({
        readAt: vsk.vstorage.readAt,
        listChildren: vsk.vstorage.keys,
        portfoliosPathPrefix: `published.${instance}.portfolios`,
        portfolioKey: `portfolio${id}`,
        decodeValue,
        sort: desc ? 'desc' : 'asc',
      });
      const entries = limit ? history.slice(0, Number(limit)) : history;
      if (!entries.length) {
        stdout.write('No history available\n');
        return;
      }
      let costBasis = 0n;
      const positionTotals = new Map();
      for (const entry of entries) {
        let header;
        let summaryLines = [];
        if (entry.kind === 'portfolio') {
          header = 'portfolio';
          summaryLines = [describePortfolioStatus(entry.value)];
        } else if (entry.kind === 'position') {
          header = `position ${entry.poolKey}`;
          const { summary, totals } = describePositionStatus(
            entry.poolKey,
            entry.value,
          );
          const prev = positionTotals.get(entry.poolKey) || {
            totalIn: 0n,
            totalOut: 0n,
          };
          const deltaIn = totals.totalIn - prev.totalIn;
          const deltaOut = totals.totalOut - prev.totalOut;
          const delta = deltaIn - deltaOut;
          costBasis += delta;
          positionTotals.set(entry.poolKey, totals);
          summaryLines = [
            summary,
            `Δin=${deltaIn} Δout=${deltaOut} costBasis=${costBasis}`,
          ];
        } else {
          header = `flow ${entry.flowKey}`;
          const { summary, nextBasis } = describeFlowEvent(entry, costBasis);
          costBasis = nextBasis;
          summaryLines = [summary, `costBasis=${costBasis}`];
        }
        stdout.write(
          `\n[block ${entry.blockHeight}] ${header}\n  ${summaryLines.join('\n  ')}\n`,
        );
      }
      stdout.write(
        `\nDisplayed ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} (of ${history.length})\n`,
      );
    });

  return portfolio;
};
