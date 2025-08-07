/// <reference types="ses" />
/* eslint-env node */
import { inspect } from 'node:util';
import { q, Fail } from '@endo/errors';
import { Nat } from '@endo/nat';
import { PortfolioStatusShapeExt } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { AmountMath } from '@agoric/ertp';
import type { SigningStargateClient } from '@cosmjs/stargate';
import type { InvokeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import { mustMatch } from '@agoric/internal';
import { StreamCellShape } from '@agoric/internal/src/lib-chainStorage.js';
import { fromUniqueEntries } from '@agoric/internal/src/ses-utils.js';
import type { StatusFor } from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { VstorageKit, SmartWalletKit } from '@agoric/client-utils';
import type { Bech32Address } from '@agoric/orchestration';
import type { CosmosRPCClient } from './cosmos-rpc.ts';
import type { SpectrumClient } from './spectrum-client.ts';
import type { CosmosRestClient } from './cosmos-rest-client.ts';
import { handleDeposit } from './plan-deposit.ts';
import { submitAction } from './swingset-tx.ts';

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
 */
const encodedKeyToPath = (key: string) => {
  const split = key.split(EncodedKeySeparator);
  split.length > 1 || Fail`invalid encoded key ${q(key)}`;
  const encodedPath = split.slice(1).join(EncodedKeySeparator);
  const path = encodedPath.replaceAll(EncodedKeySeparator, PathSeparator);
  return path;
};

/**
 * Determine whether a dot-separated path starts with a sequence of path
 * components.
 */
const vstoragePathStartsWith = (path: string, prefix: string) =>
  path === prefix ||
  path.startsWith(prefix.endsWith('.') ? prefix : `${prefix}.`);

const stripPrefix = (prefix: string, str: string) => {
  str.startsWith(prefix) || Fail`${str} is missing prefix ${q(prefix)}`;
  return str.slice(prefix.length);
};

/**
 * Parse input as JSON, or handle an error (for e.g. substituting a default or
 * applying a more specific message).
 */
const tryJsonParse = (json: string, replaceErr?: (err?: Error) => unknown) => {
  try {
    return JSON.parse(json);
  } catch (err) {
    if (!replaceErr) throw err;
    try {
      return replaceErr(err);
    } catch (newErr) {
      if (!newErr.cause) assert.note(newErr, err.message);
      throw newErr;
    }
  }
};

/**
 * Map the elements of an array to new values, skipping elements for which the
 * mapping results in either `undefined` or `false`.
 */
const partialMap = <T, U>(
  arr: T[],
  mapOrDrop: (value: T, index?: number, arr?: T[]) => U | undefined | false,
): U[] =>
  arr.flatMap((el, i, arrArg) => {
    const result = mapOrDrop(el, i, arrArg);
    if (result === undefined || result === false) return [];
    return [result];
  });

type IO = {
  rpc: CosmosRPCClient;
  vstorageKit: VstorageKit;
  spectrum: SpectrumClient;
  cosmosRest: CosmosRestClient;
  stargateClient: SigningStargateClient;
  walletKit: SmartWalletKit;
  plannerAddress: string;
};

export const startEngine = async ({
  rpc,
  vstorageKit,
  spectrum,
  cosmosRest,
  stargateClient,
  walletKit,
  plannerAddress,
}: IO) => {
  await null;

  const chainStatus = await rpc.request('status', {});
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
  const portfolioAddressRecords = await Promise.all(
    portfolioKeys.map(async portfolioKey => {
      const status = await vstorageKit.readPublished(
        `${stripPrefix('published.', VSTORAGE_PATH_PREFIX)}.${portfolioKey}`,
      );
      mustMatch(status, PortfolioStatusShapeExt, portfolioKey);
      const { depositAddress } = status;
      if (!depositAddress) return;
      return { portfolioKey, depositAddress };
    }),
  );
  const portfolioKeyForDepositAddr = new Map(
    partialMap(
      portfolioAddressRecords,
      record => record && [record.depositAddress, record.portfolioKey],
    ),
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

      // Capture vstorage updates.
      const eventRecords = Object.entries(respData).flatMap(([key, value]) => {
        // We care about result_begin_block/result_end_block/etc.
        if (!key.startsWith('result_')) return [];
        const events = (value as any)?.events;
        if (!events) console.warn('missing events', type, key);
        return events ?? [];
      }) as CosmosEvent[];
      const portfolioVstorageEvents = partialMap(eventRecords, eventRecord => {
        const { type: eventType, attributes: attrRecords } = eventRecord;
        // Filter for vstorage state_change events.
        // cf. golang/cosmos/types/events.go
        if (eventType !== 'state_change') return;
        const attributes = fromUniqueEntries(
          attrRecords?.map(({ key, value }) => [key, value]) || [],
        );
        if (attributes.store !== 'vstorage') return;

        // Require attributes "key" and "value".
        if (attributes.key === undefined || attributes.value === undefined) {
          console.error('vstorage state_change missing "key" and/or "value"');
          return;
        }

        // Filter for ymax portfolio paths.
        const path = encodedKeyToPath(attributes.key);
        if (!vstoragePathStartsWith(path, VSTORAGE_PATH_PREFIX)) return;

        return { path, value: attributes.value };
      });

      // Detect new portfolios.
      for (const { path, value: vstorageValue } of portfolioVstorageEvents) {
        const streamCell = tryJsonParse(
          vstorageValue,
          _err =>
            Fail`non-JSON value at vstorage path ${q(path)}: ${vstorageValue}`,
        );
        mustMatch(harden(streamCell), StreamCellShape);
        if (path === VSTORAGE_PATH_PREFIX) {
          for (let i = 0; i < streamCell.values.length; i += 1) {
            const strValue = streamCell.values[i];
            const value = tryJsonParse(
              // @ts-expect-error use `undefined` to force an error for non-string input
              typeof strValue === 'string' ? strValue : undefined,
              _err =>
                Fail`non-JSON StreamCell value for ${q(path)} index ${q(i)}: ${strValue}`,
            );
            const portfoliosData = vstorageKit.marshaller.fromCapData(
              value,
            ) as StatusFor['portfolios'];
            if (portfoliosData.addPortfolio) {
              const key = portfoliosData.addPortfolio;
              console.warn('Detected new portfolio', key);
              // XXX we should probably read at streamCell.blockHeight.
              const status = await vstorageKit.readPublished(
                `${stripPrefix('published.', VSTORAGE_PATH_PREFIX)}.${key}`,
              );
              mustMatch(status, PortfolioStatusShapeExt, key);
              const { depositAddress } = status;
              if (!depositAddress) continue;
              portfolioKeyForDepositAddr.set(depositAddress, key);
              console.warn('Added new portfolio', key, depositAddress);
            }
          }
        }
        // TODO: Handle portfolio-level path `${VSTORAGE_PATH_PREFIX}.${portfolioKey}` for addition/update of depositAddress.
      }

      // Detect activity against portfolio deposit addresses.
      const addrsWithActivity: Bech32Address[] = [
        ...new Set([
          ...(respEvents['coin_received.receiver'] || []),
          ...(respEvents['coin_spent.spender'] || []),
          ...(respEvents['transfer.recipient'] || []),
          ...(respEvents['transfer.sender'] || []),
        ]),
      ];
      const depositAddrsWithActivity = new Map(
        partialMap(addrsWithActivity, addr => {
          const portfolioKey = portfolioKeyForDepositAddr.get(addr);
          return portfolioKey ? [addr, portfolioKey] : undefined;
        }),
      );

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

      const vbankAssets = new Map(
        depositAddrsWithActivity.size
          ? await vstorageKit.readPublished('agoricNames.vbankAsset')
          : undefined,
      );

      // Respond to deposits.
      const portfolioOps = await Promise.all(
        [...depositAddrsWithActivity.entries()].map(
          async ([addr, portfolioKey]) => {
            // TODO: maybe snapshot initial balances for deposit amount determination?
            // For now, require a single denom and assume that the full amount is a new deposit.
            const balances = addrBalances[addr];
            if (balances.length !== 1) {
              console.error(
                `Unclear which denom to handle for ${addr}`,
                balances.map(amount => amount.denom),
              );
              return;
            }
            const { denom, amount: balanceValue } = balances[0];

            const brand = vbankAssets.get(denom)?.brand as
              | undefined
              | Brand<'nat'>;
            if (!brand) throw Fail`no brand found for denom ${q(denom)}`;
            const amount = AmountMath.make(brand, Nat(BigInt(balanceValue)));

            const unprefixedPortfolioPath = stripPrefix(
              'published.',
              `${VSTORAGE_PATH_PREFIX}.${portfolioKey}`,
            );

            const steps = await handleDeposit(
              amount,
              unprefixedPortfolioPath as any,
              vstorageKit.readPublished,
              spectrum,
              cosmosRest,
            );

            // TODO: consolidate with portfolioIdOfPath
            const portfolioId = parseInt(
              stripPrefix(`portfolio`, portfolioKey),
              10,
            );

            return { portfolioId, steps };
          },
        ),
      );

      for (const { portfolioId, steps } of portfolioOps.filter(x => !!x)) {
        const action: InvokeAction = harden({
          method: 'invokeItem',
          name: 'planner',
          steps: [{ method: 'submit', args: [portfolioId, steps] }],
        });

        console.log('submitting action', action);
        const result = await submitAction(action, {
          stargateClient,
          walletKit,
          skipPoll: true,
          address: plannerAddress,
        });
        console.log('result', result);
      }
    }
  } finally {
    console.warn('Terminating...');
    rpc.close();
  }
};
harden(startEngine);
