import '../lockdown.ts';
import { createContext } from './support.ts';
import { handleGmp, type GmpArgsMap } from './handle-gmp.ts';

const printUsage = () => {
  console.log(`
Usage: yarn axelar -- <command> [options]

Commands:
  createRemoteAccount <chain> <gasAmount>
    Create a remote EVM account on the specified chain
    
  supplyToAave <chain> <gasAmount> <transferAmount> <remoteAddress>
    Supply USDC to Aave on the specified chain
    
  supplyToCompound <chain> <gasAmount> <transferAmount> <remoteAddress>
    Supply USDC to Compound on the specified chain

Options:
  chain: One of Avalanche, Arbitrum, Optimism, Polygon
  gasAmount: Gas amount in base units (BLD)
  transferAmount: Transfer amount in base units (USDC)
  remoteAddress: The remote EVM address to interact with

Environment Variables:
  MNEMONIC: Required - Your wallet mnemonic phrase
  NETWORK: Optional - mainnet or devnet (default: devnet)

Examples:
  yarn axelar -- createRemoteAccount Arbitrum 1000000
  yarn axelar -- supplyToAave Arbitrum 1000000 1000000000 0x1234...
  yarn axelar -- supplyToCompound Polygon 1000000 500000000 0x5678...
`);
};

type Command = keyof GmpArgsMap;

const COMMANDS = [
  'createRemoteAccount',
  'supplyToAave',
  'supplyToCompound',
] as const;
function isCommand(x: string): x is Command {
  return (COMMANDS as readonly string[]).includes(x);
}
export const main = async (argv: string[]) => {
  const [rawCommand, ...args] = argv.slice(2);

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    console.error('Error: MNEMONIC environment variable is required');
    process.exit(1);
  }

  const network = (process.env.NETWORK as 'mainnet' | 'testnet') || 'testnet';

  if (!rawCommand) {
    printUsage();
    return;
  }

  if (!isCommand(rawCommand)) {
    console.error(
      `Error: Unknown command '${rawCommand}'. Valid commands: ${COMMANDS.join(', ')}`,
    );
    process.exit(1);
  }

  try {
    const ctx = await createContext(mnemonic, network);
    const command: Command = rawCommand;
    await handleGmp(ctx, command, args as GmpArgsMap[typeof command]);
  } catch (error) {
    console.error('Error executing command:', error);
    process.exit(1);
  }
};

main(process.argv).catch(console.error);
