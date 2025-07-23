import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { config } from 'dotenv';
import { stringToPath } from '@cosmjs/crypto';
import { StargateClient } from '@cosmjs/stargate';
import { JsonRpcProvider, Contract, formatEther, formatUnits } from 'ethers';

config();

export const getSigner = async () => {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    console.error('Mnemonic not found in environment variables.');
    process.exit(1);
  }
  const Agoric = {
    Bech32MainPrefix: 'agoric',
    CoinType: 564,
  };
  const hdPath = (coinType = 118, account = 0) =>
    stringToPath(`m/44'/${coinType}'/${account}'/0/0`);

  return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: Agoric.Bech32MainPrefix,
    hdPaths: [hdPath(Agoric.CoinType, 0), hdPath(Agoric.CoinType, 1)],
  });
};

export const getSignerWallet = async ({ prefix }) => {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    console.error('Mnemonic not found in environment variables.');
    process.exit(1);
  }

  return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix,
  });
};
export const wait = async seconds => {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

export const checkBalance = async ({ walletAddress, rpcUrl }) => {
  try {
    const client = await StargateClient.connect(rpcUrl);
    const balances = await client.getAllBalances(walletAddress);

    if (balances.length != 0) {
      console.log(`Balance for ${walletAddress}:`);
      balances.forEach(balance => {
        const tokenName = balance.denom;
        console.log(`${Number(balance.amount) / 1000_000} ${tokenName}`);
      });
    } else {
      console.log('Account does not exist.');
    }

    client.disconnect();
  } catch (error) {
    console.error(`Failed to fetch balance: ${error.message}`);
  }
};

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
];

export const checkBalanceEVM = async ({ walletAddress, rpcUrl, tokens }) => {
  try {
    const provider = new JsonRpcProvider(rpcUrl);

    // Get native AVAX balance
    const balanceWei = await provider.getBalance(walletAddress);
    const balanceAvax = formatEther(balanceWei);
    console.log(`Native AVAX: ${balanceAvax}`);

    // Loop over token contracts
    for (const token of tokens) {
      const contract = new Contract(token, ERC20_ABI, provider);
      const [name, symbol, decimals, rawBalance] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.balanceOf(walletAddress),
      ]);

      const balance = formatUnits(rawBalance, decimals);
      console.log(`${name} (${symbol}): ${balance}`);
    }
  } catch (error) {
    console.error('Error fetching balances:', error);
  }
};
