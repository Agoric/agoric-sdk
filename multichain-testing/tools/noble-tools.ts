import type { IBCChannelID } from '@agoric/vats';
import type { CosmosChainAddress } from '@agoric/orchestration';
import type { NobleAddress } from '@agoric/fast-usdc';
import type { ExecSyncOptions } from 'node:child_process';
import { btoa } from '@endo/base64';

const kubectlBinary = 'kubectl';
const noblePod = 'noblelocal-genesis-0';
const nobleBinary = 'nobled';

const makeKubeArgs = () => {
  return [
    'exec',
    '-i',
    noblePod,
    '-c',
    'validator',
    '--tty=false',
    '--',
    nobleBinary,
  ];
};

export const makeNobleTools = (
  {
    execFileSync,
  }: {
    execFileSync: (typeof import('node:child_process'))['execFileSync'];
  },
  log: (...args: unknown[]) => void = (...args) =>
    console.log('NobleTools', ...args),
) => {
  const exec = (
    args: string[],
    opts: ExecSyncOptions = {
      encoding: 'utf-8' as const,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  ) =>
    execFileSync(kubectlBinary, [...makeKubeArgs(), ...args], opts) as string;

  const registerForwardingAcct = (
    channelId: IBCChannelID,
    address: CosmosChainAddress['value'],
  ): { txhash: string; code: number; data: string; height: string } => {
    log('creating forwarding address', address, channelId);
    return JSON.parse(
      exec([
        'tx',
        'forwarding',
        'register-account',
        channelId,
        address,
        '--from=genesis',
        '-y',
        // FIXME removed in cosmos-sdk https://github.com/Agoric/agoric-sdk/issues/9016
        '--broadcast-mode',
        'block',
      ]),
    );
  };

  const mockCctpMint = (
    amount: bigint,
    destination: CosmosChainAddress['value'],
  ) => {
    const denomAmount = `${Number(amount)}uusdc`;
    log('mock cctp mint', destination, denomAmount);
    return JSON.parse(
      exec([
        'tx',
        'bank',
        'send',
        'faucet',
        destination,
        denomAmount,
        '--from=faucet',
        '-y',
        // FIXME removed in cosmos-sdk https://github.com/Agoric/agoric-sdk/issues/9016
        '--broadcast-mode',
        'block',
      ]),
    );
  };

  const queryForwardingAddress = (
    channelId: IBCChannelID,
    address: CosmosChainAddress['value'],
  ): { address: NobleAddress; exists: boolean } => {
    log('querying forwarding address', address, channelId);
    return JSON.parse(
      exec([
        'query',
        'forwarding',
        'address',
        channelId,
        address,
        '--output=json',
      ]),
    );
  };

  /**
   * Query for transactions matching the given query string
   * @param query The query string to search for transactions
   * @param nodeUrl Optional node URL, defaults to local node
   * @returns The response from the query including matching transactions
   *
   * @example
   * ```js
   * nobleTools.queryTxs("circle.cctp.v1.DepositForBurn.depositor CONTAINS 'noble1th2w4kf5j5z9wj7lsu5vk8r06sadgvnddmwqrwwkd6lpr00zccpsy0wd6r'");
   * ```
   */
  const queryTxs = (
    query: string,
    nodeUrl: string = 'http://localhost:26654',
  ) => {
    log('querying transactions with filter', query);
    return JSON.parse(
      exec([
        'query',
        'txs',
        '--query',
        query,
        '--node',
        nodeUrl,
        '--output=json',
      ]),
    ) as {
      count: string;
      limit: string;
      page_number: string;
      page_total: string;
      total_count: string;
      txs: {
        code: number;
        events: [];
        logs: [];
        raw_log: string;
        txhash: string;
      }[];
    };
  };

  /**
   * Verify that a transaction contains a valid CCTP DepositForBurn
   * @param txHash The transaction hash to verify
   * @param nodeUrl Optional node URL, defaults to local node
   * @returns Object containing verification status and extracted CCTP message if successful
   */
  const verifyDepositForBurn = (
    txHash: string,
    nodeUrl: string = 'http://localhost:26654',
  ) => {
    log('verifying DepositForBurn transaction', txHash);
    const txResponse = JSON.parse(
      exec(['query', 'tx', txHash, '--node', nodeUrl, '--output=json']),
    );

    const events = txResponse.logs?.flatMap(log => log.events) || [];

    // Check for all required events
    const messageSentEvent = events.find(
      evt => evt.type === 'circle.cctp.v1.MessageSent',
    );
    const burnEvent = events.find(
      evt =>
        evt.type === 'noble.fiattokenfactory.MsgBurn' ||
        evt.type === 'circle.fiattokenfactory.v1.MsgBurn',
    );
    const depositForBurnEvent = events.find(
      evt => evt.type === 'circle.cctp.v1.DepositForBurn',
    );

    const isValid = !!messageSentEvent && !!burnEvent && !!depositForBurnEvent;

    let cctpMessage = '';
    let burnAmount = '';
    let mintRecipient = '';
    let nonce = '';

    if (isValid) {
      cctpMessage =
        messageSentEvent.attributes.find(
          attr => attr.key === 'message' || attr.key === btoa('message'),
        )?.value || '';

      // Remove surrounding quotes if present
      if (cctpMessage.startsWith('"') && cctpMessage.endsWith('"')) {
        cctpMessage = cctpMessage.slice(1, -1);
      }

      burnAmount =
        depositForBurnEvent.attributes.find(
          attr => attr.key === 'amount' || attr.key === btoa('amount'),
        )?.value || '';

      mintRecipient =
        depositForBurnEvent.attributes.find(
          attr =>
            attr.key === 'mint_recipient' ||
            attr.key === btoa('mint_recipient'),
        )?.value || '';

      nonce =
        depositForBurnEvent.attributes.find(
          attr => attr.key === 'nonce' || attr.key === btoa('nonce'),
        )?.value || '';
    }
    return {
      isValid,
      txResponse,
      cctpMessage,
      burnAmount,
      mintRecipient,
      nonce,
      events: {
        messageSentEvent,
        burnEvent,
        depositForBurnEvent,
      },
    };
  };

  return {
    mockCctpMint,
    queryForwardingAddress,
    registerForwardingAcct,
    queryTxs,
    verifyDepositForBurn,
  };
};

export type NobleTools = ReturnType<typeof makeNobleTools>;
