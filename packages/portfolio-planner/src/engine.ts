/// <reference types="ses" />
/* eslint-env node */
import { inspect } from 'node:util';
import { q, Fail } from '@endo/errors';
import { PortfolioStatusShapeExt } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { mustMatch } from '@agoric/internal';
import { fromUniqueEntries } from '@agoric/internal/src/ses-utils.js';
import type { VstorageKit } from '@agoric/client-utils';
import type { Bech32Address } from '@agoric/orchestration';
import type { CosmosCommand } from './cosmos-cmd.js';
import type { CosmosRPCClient } from './cosmos-rpc.ts';
import type { SpectrumClient } from './spectrum-client.ts';
import type { CosmosRestClient } from './cosmos-rest-client.ts';

type CosmosEvent = {
  type: string;
  attributes?: Array<{ key: string; value: string }>;
};

const VSTORAGE_PATH_PREFIX = 'published.ymax0.portfolios';

/** cf. golang/cosmos/x/vstorage/types/path_keys.go */
const EncodedKeySeparator = '\x00';
const PathSeparator = '.';

/**
 * TODO: Promote elsewhere, maybe @agoric/internal?
 * cf. golang/cosmos/x/vstorage/types/path_keys.go
 * 
 * NOTE: Exported for testing purposes only
 */
export const encodedKeyToPath = (key: string) => {
  const split = key.split(EncodedKeySeparator);
  split.length > 1 || Fail`invalid encoded key ${q(key)}`;
  const encodedPath = split.slice(1).join(EncodedKeySeparator);
  const path = encodedPath.replaceAll(EncodedKeySeparator, PathSeparator);
  return path;
};

const stripPrefix = (prefix: string, str: string) => {
  str.startsWith(prefix) || Fail`${str} is missing prefix ${prefix}`;
  return str.slice(prefix.length);
};

type IO = {
  agd: CosmosCommand;
  rpc: CosmosRPCClient;
  vstorageKit: VstorageKit;
  spectrum: SpectrumClient;
  cosmosRest: CosmosRestClient;
};

export const startEngine = async ({
  agd,
  rpc,
  vstorageKit,
  spectrum,
  cosmosRest,
}: IO) => {
  await null;
  let chainStatus = await (await agd.exec(['status'])).stdout;
  try {
    const statusObj = JSON.parse(chainStatus);
    if (JSON.stringify(statusObj) === chainStatus.trim())
      chainStatus = statusObj;
  } catch (_err) {
    // ignore
  }
  console.warn('agd status', chainStatus);

  // Test Spectrum API with real pool balance data
  try {
    console.warn('\n[Engine] Testing Spectrum pool balance API...');
    const testEthAddress = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'; // Example ETH address

    const testCases = [{ chain: 'ethereum', pool: 'aave' }];

    for (const testCase of testCases) {
      try {
        console.warn(
          `\n[Engine] Testing ${testCase.chain}/${testCase.pool} pool balance for ${testEthAddress}`,
        );
        const poolBalance = await spectrum.getPoolBalance(
          testCase.chain as any,
          testCase.pool as any,
          testEthAddress,
        );
        console.warn(`[Engine] ✅ Pool balance found:`, {
          supplyBalance: poolBalance.balance.supplyBalance.toLocaleString(),
          borrowAmount: poolBalance.balance.borrowAmount.toLocaleString(),
          chain: poolBalance.chain,
          pool: poolBalance.pool,
        });
      } catch (specError) {
        console.warn(
          `[Engine] Pool balance test (${testCase.chain}/${testCase.pool}): ${specError instanceof Error ? specError.message : specError}`,
        );
      }
    }
  } catch (error) {
    console.error('[Engine] Spectrum balance testing failed:', error);
  }

  // Test Cosmos REST API client with Noble chain
  try {
    console.warn('[Engine] Testing Cosmos REST API client...');
    const availableChains = cosmosRest.getAvailableChains();
    console.warn(
      `[Engine] Available chains: ${availableChains.map(c => c.config.name).join(', ')}`,
    );

    // Test chain info for Noble
    const nobleInfo = await cosmosRest.getChainInfo('noble');
    console.warn(
      `[Engine] Noble chain info retrieved successfully. Chain ID: ${(nobleInfo as any)?.default_node_info?.network || 'unknown'}`,
    );

    // Test balance fetching for a known address (this will fail gracefully if address doesn't exist)
    // Using a placeholder address - in real usage, this would be a user's address
    const testAddress = 'noble1xw2j23rcwrkg02yxdn5ha2d2x868cuk6370s9y'; // This is just for testing the API structure
    try {
      const balances = await cosmosRest.getAccountBalances(
        'noble',
        testAddress,
      );
      console.warn(
        `[Engine] Noble balance API test successful. Response structure verified. Found ${balances.balances.length} balance(s):`,
        balances.balances
          .map(coin => `${coin.amount} ${coin.denom}`)
          .join(', ') || 'No balances',
      );
    } catch (balanceError) {
      // This is expected to fail with the test address, but shows the API is working
      console.warn(
        `[Engine] Noble balance API responding (expected error for test address): ${balanceError instanceof Error ? balanceError.message : balanceError}`,
      );
    }
  } catch (error) {
    console.error('[Engine] Cosmos REST API initialization failed:', error);
    // Continue with limited functionality
  }

  const agoricInfo = await cosmosRest.getChainInfo('agoric');
  const agoricChainId = (agoricInfo as any)?.default_node_info?.network;
  console.warn('Retrieved info for Agoric chain', agoricChainId);

  await rpc.opened();
  // console.warn('RPC client opened:', rpc);

  // TODO: verify consumption of paginated data.
  const portfolioKeys = await vstorageKit.vstorage.keys(VSTORAGE_PATH_PREFIX);
  const portfolioAddressEntries = await Promise.all(
    portfolioKeys.map(async key => {
      const status = await vstorageKit.readPublished(
        `${stripPrefix('published.', VSTORAGE_PATH_PREFIX)}.${key}`,
      );
      mustMatch(status, PortfolioStatusShapeExt, key);
      const { depositAddress } = status;
      if (!depositAddress) return undefined;
      return [key, depositAddress] as [string, Bech32Address];
    }),
  );
  const depositAddresses = new Map(
    portfolioAddressEntries.filter(entry => entry) as [string, Bech32Address][],
  );

  try {
    // console.warn('consuming events');
    const responses = rpc.subscribeAll([
      // vstorage events are in BEGIN_BLOCK/END_BLOCK activity
      "tm.event = 'NewBlockHeader'",
      // transactions
      "tm.event = 'Tx'",
    ]);
    for await (const {
      query: _query,
      data: resp,
      events: respEvents,
    } of responses) {
      const { type, value: respData } = resp;
      if (!respEvents) {
        console.warn('missing events', type);
        continue;
      }
      const addrsWithActivity = [
        ...new Set([
          ...(respEvents['coin_received.receiver'] || []),
          ...(respEvents['coin_spent.spender'] || []),
          ...(respEvents['transfer.recipient'] || []),
          ...(respEvents['transfer.sender'] || []),
        ]),
      ];
      const depositAddrsWithActivity = [...addrsWithActivity].filter(addr =>
        depositAddresses.has(addr),
      );

      const eventRecords = Object.entries(respData).flatMap(
        ([key, value]: [string, any]) => {
          // We care about result_begin_block/result_end_block/etc.
          if (!key.startsWith('result_')) return [];
          if (!value?.events) {
            console.warn('missing events', type, key);
            return [];
          }
          return value.events as CosmosEvent[];
        },
      );
      const portfolioVstorageEvents = eventRecords.flatMap(eventRecord => {
        const { type: eventType, attributes: attrRecords } = eventRecord;
        // Filter for vstorage state_change events.
        // cf. golang/cosmos/types/events.go
        if (eventType !== 'state_change') return [];
        const attributes = fromUniqueEntries(
          attrRecords?.map(({ key, value }) => [key, value]) || [],
        );
        if (attributes.store !== 'vstorage') return [];

        // Require attributes "key" and "value".
        if (attributes.key === undefined || attributes.value === undefined) {
          console.error('vstorage state_change missing "key" and/or "value"');
          return [];
        }

        // Filter for ymax portfolio paths.
        const path = encodedKeyToPath(attributes.key);
        if (
          path !== VSTORAGE_PATH_PREFIX &&
          !path.startsWith(`${VSTORAGE_PATH_PREFIX}.`)
        ) {
          return [];
        }

        return [{ path, value: attributes.value }];
      });

      const addrBalances = Object.fromEntries(
        await Promise.all(
          addrsWithActivity.map(async addr => {
            const balancesResp = await cosmosRest.getAccountBalances(
              'agoric',
              addr,
            );
            return [addr, balancesResp?.balances];
          }),
        ),
      );

      console.log(
        inspect(
          {
            addrsWithActivity,
            addrBalances,
            depositAddrsWithActivity,
            portfolioVstorageEvents,
          },
          { depth: 10 },
        ),
      );
    }
  } finally {
    console.warn('Terminating...');
    rpc.close();
  }
};
harden(startEngine);
