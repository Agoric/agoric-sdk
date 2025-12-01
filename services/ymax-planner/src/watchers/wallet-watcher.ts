import type { Filter, WebSocketProvider, Log } from 'ethers';
import { id, zeroPadValue, getAddress, AbiCoder } from 'ethers';
import type { CaipChainId } from '@agoric/orchestration';
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import {
  getBlockNumberBeforeRealTime,
  scanEvmLogsInChunks,
  type WatcherTimeoutOptions,
} from '../support.ts';
import { TX_TIMEOUT_MS } from '../pending-tx-manager.ts';
import {
  deleteTxBlockLowerBound,
  getTxBlockLowerBound,
  setTxBlockLowerBound,
} from '../kv-store.ts';

export const SMART_WALLET_CREATED_SIGNATURE = id(
  'SmartWalletCreated(address,string,string,string)',
);
const abiCoder = new AbiCoder();

const extractAddress = topic => {
  return getAddress(`0x${topic.slice(-40)}`);
};

const parseSmartWalletCreatedLog = (log: any) => {
  if (!log.topics || !log.data) {
    throw new Error('Malformed SmartWalletCreated log');
  }

  const wallet = extractAddress(log.topics[1]);

  const [owner, sourceChain, sourceAddress] = abiCoder.decode(
    ['string', 'string', 'string'],
    log.data,
  );

  return {
    wallet,
    owner,
    sourceChain,
    sourceAddress,
  };
};

type SmartWalletWatchBase = {
  factoryAddr: `0x${string}`;
  provider: WebSocketProvider;
  expectedAddr: `0x${string}`;
  log?: (...args: unknown[]) => void;
};

type SmartWalletWatch = SmartWalletWatchBase & {
  kvStore: KVStore;
  txId: `tx${number}`;
};

export const watchSmartWalletTx = ({
  factoryAddr,
  provider,
  expectedAddr,
  timeoutMs = TX_TIMEOUT_MS,
  log = () => {},
  setTimeout = globalThis.setTimeout,
  signal,
}: SmartWalletWatchBase & WatcherTimeoutOptions): Promise<boolean> => {
  return new Promise(resolve => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }

    const TO_TOPIC = zeroPadValue(expectedAddr.toLowerCase(), 32);
    const filter = {
      address: factoryAddr,
      topics: [SMART_WALLET_CREATED_SIGNATURE, TO_TOPIC],
    };

    log(`Watching SmartWalletCreated events emitted by ${factoryAddr}`);

    let walletCreated = false;
    let timeoutId: NodeJS.Timeout;
    let listeners: Array<{ event: any; listener: any }> = [];

    const finish = (result: boolean) => {
      resolve(result);
      if (timeoutId) clearTimeout(timeoutId);
      for (const { event, listener } of listeners) {
        void provider.off(event, listener);
      }
      listeners = [];
    };

    signal?.addEventListener('abort', () => finish(false));

    const listenForSmartWalletCreation = (eventLog: Log) => {
      let eventData;
      try {
        eventData = parseSmartWalletCreatedLog(eventLog);
      } catch (error: any) {
        log(`Log parsing error:`, error.message);
        return;
      }

      const { wallet } = eventData;
      const normalizedWallet = wallet.toLowerCase();
      log(`SmartWalletCreated event detected: wallet:${normalizedWallet}`);
      if (normalizedWallet === expectedAddr) {
        log(
          `✓ Address matches! Expected: ${expectedAddr}, Found: ${normalizedWallet}`,
        );
        walletCreated = true;
        finish(true);
        return;
      }
      log(
        `Address mismatch. Expected: ${expectedAddr}, Found: ${normalizedWallet}`,
      );
    };

    void provider.on(filter, listenForSmartWalletCreation);
    listeners.push({ event: filter, listener: listenForSmartWalletCreation });

    timeoutId = setTimeout(() => {
      if (!walletCreated) {
        log(
          `✗ No matching SmartWalletCreated event found within ${timeoutMs / 60000} minutes`,
        );
      }
    }, timeoutMs);
  });
};

export const lookBackSmartWalletTx = async ({
  factoryAddr,
  provider,
  expectedAddr,
  publishTimeMs,
  chainId,
  log = () => {},
  signal,
  kvStore,
  txId,
}: SmartWalletWatch & {
  publishTimeMs: number;
  chainId: CaipChainId;
  signal?: AbortSignal;
}): Promise<boolean> => {
  await null;
  try {
    const fromBlock = await getBlockNumberBeforeRealTime(
      provider,
      publishTimeMs,
    );
    const toBlock = await provider.getBlockNumber();

    const savedFromBlock = getTxBlockLowerBound(kvStore, txId) || fromBlock;

    log(
      `Searching blocks ${savedFromBlock} → ${toBlock} for SmartWalletCreated events emitted by ${factoryAddr}`,
    );

    const toTopic = zeroPadValue(expectedAddr.toLowerCase(), 32);
    const baseFilter: Filter = {
      address: factoryAddr,
      topics: [SMART_WALLET_CREATED_SIGNATURE, toTopic],
    };

    const matchingEvent = await scanEvmLogsInChunks(
      {
        provider,
        baseFilter,
        fromBlock: savedFromBlock,
        toBlock,
        chainId,
        log,
        signal,
        onRejectedChunk: (_, to) => {
          setTxBlockLowerBound(kvStore, txId, to);
        },
      },
      ev => {
        try {
          const t = parseSmartWalletCreatedLog(ev);
          const normalizedWallet = t.wallet.toLowerCase();
          log(`Check: addresss=${normalizedWallet}`);
          return normalizedWallet === expectedAddr;
        } catch (e) {
          log(`Parse error:`, e);
          return false;
        }
      },
    );

    if (!matchingEvent) {
      log(`No matching SmartWalletCreated event found`);
      return false;
    }
    deleteTxBlockLowerBound(kvStore, txId);
    return true;
  } catch (error) {
    log(`Error:`, error);
    return false;
  }
};
