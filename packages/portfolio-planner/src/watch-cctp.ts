import { Interface, JsonRpcProvider, Log } from 'ethers';
import type { AxelarChain } from '@aglocal/portfolio-contract/src/constants';

// Using only 'Ethereum' for now because CCTP transfers to it work reliably off-chain.
// Other testnet chains currently have issues, so we're excluding them for the time being.
export type EVMChain = keyof typeof AxelarChain | 'Ethereum';

const TIMEOUT = 5 * 60 * 1000; // 5 minutes

// TODO: populate this for all the chains we support
export const EVM_RPC: Partial<Record<EVMChain, string>> = {
  Ethereum: 'https://ethereum-sepolia-rpc.publicnode.com',
} as const;

// CCTP Contracts (Testnet sources)
const TOKEN_MESSENGER: Partial<Record<EVMChain, string>> = {
  Ethereum: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
} as const;

const MESSAGE_TRANSMITTER: Partial<Record<EVMChain, string>> = {
  Ethereum: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
} as const;

const MINT_ABI = [
  'event MintAndWithdraw(address indexed mintRecipient, uint256 amount, address indexed mintToken)',
];

const MSG_ABI = [
  'event MessageReceived(address indexed caller, uint32 sourceDomain, uint64 nonce, bytes32 sender, bytes messageBody)',
];

export const watchCCTPMint = async ({
  chain,
  recipient,
  expectedAmount,
  provider,
}: {
  chain: EVMChain;
  recipient: string;
  expectedAmount: bigint;
  provider: JsonRpcProvider;
}): Promise<boolean> => {
  const tokenMessenger = TOKEN_MESSENGER[chain];
  const messageTransmitter = MESSAGE_TRANSMITTER[chain];

  if (!tokenMessenger || !messageTransmitter) {
    throw new Error(`Missing RPC or contract address for chain ${chain}`);
  }

  const mintIface = new Interface(MINT_ABI);
  const msgIface = new Interface(MSG_ABI);

  const filter = {
    address: tokenMessenger,
    topics: [mintIface.getEvent('MintAndWithdraw')!.topicHash],
  };

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      provider.off(filter); // Clean up
      console.log('❌ Timed out waiting for mint');
      resolve(false);
    }, TIMEOUT);

    provider.on(filter, async (log: Log) => {
      try {
        const parsed = mintIface.parseLog(log);

        if (!parsed) return;

        const { mintRecipient, amount } = parsed.args;
        console.log({ mintRecipient, amount });

        if (
          mintRecipient.toLowerCase() !== recipient.toLowerCase() &&
          amount !== expectedAmount
        ) {
          return;
        }

        const receipt = await provider.getTransactionReceipt(
          log.transactionHash,
        );
        console.log({ receipt });
        if (!receipt) return;

        // TODO: what if MessageReceived is delayed
        // Go theough the MessageTrasnmitter Contract
        for (const txLog of receipt.logs) {
          if (
            txLog.address.toLowerCase() === messageTransmitter.toLowerCase()
          ) {
            try {
              const parsedMsg = msgIface.parseLog(txLog);
              if (parsedMsg?.name === 'MessageReceived') {
                clearTimeout(timeout);
                provider.off(filter);
                console.log(`✅ CCTP Mint confirmed!`);
                return resolve(true);
              }
            } catch {
              continue;
            }
          }
        }
      } catch (err) {
        console.error('❌ Failed to parse log:', err);
        clearTimeout(timeout);
        provider.off(filter);
        reject(err);
      }
    });
  });
};
