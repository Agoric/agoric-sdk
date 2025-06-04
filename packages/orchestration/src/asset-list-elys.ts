import crypto from 'crypto';
import chainInfo from './fetched-chain-info.js';

// Sample input data (replace this with the actual imported data)

type ChainConfig = {
  bech32Prefix: string;
  chainId: string;
  icqEnabled: boolean;
  namespace: string;
  reference: string;
  stakingTokens: readonly { denom: string }[];
  connections: Record<
    string,
    {
      id: string;
      client_id: string;
      counterparty: { client_id: string; connection_id: string };
      state: number;
      transferChannel: {
        channelId: string;
        portId: string;
        counterPartyChannelId: string;
        counterPartyPortId: string;
        ordering: number;
        state: number;
        version: string;
      };
    }
  >;
};

// Utility function to compute SHA256 hash in uppercase
const computeHash = (input: string): string => {
  return crypto.createHash('sha256').update(input).digest('hex').toUpperCase();
};

// Main function to generate the configuration
export const generateAssetListConfig = (chains: Record<string, ChainConfig>) => {
  const result: [string, Record<string, string>][] = [];

  const agoricReference = chains['agoric']?.reference;
  const elysReference = chains['elys']?.reference;

  const connectionDataFromStrideToElys = chains['stride']?.connections[elysReference];
  const connectionDataFromElysToAgoric = chains['elys']?.connections[agoricReference];

  for (const [chainName, chainData] of Object.entries(chains)) {
    const { stakingTokens, connections } = chainData;

    // Validate stakingTokens
    if (stakingTokens.length !== 1) {
      throw new Error(`Chain ${chainName} has more than one staking token.`);
    }
    const stakingDenom = stakingTokens[0].denom;

    // First entry
    result.push([
      stakingDenom,
      {
        baseDenom: stakingDenom,
        baseName: chainName,
        chainName,
      },
    ]);

    if (chainName === 'elys' || chainName === 'agoric' || chainName === 'stride') {
      continue
    }

    // Second entry, ibc denom from host chains
    const connectionDataWithAgoric = connections[agoricReference];
    const ibcDenomOfStakingTokenOnAgoric = computeHash(`transfer/${connectionDataWithAgoric.transferChannel.counterPartyChannelId}/${stakingDenom}`);
    result.push([
      `ibc/${ibcDenomOfStakingTokenOnAgoric}`,
      {
        baseDenom: stakingDenom,
        baseName: chainName,
        chainName: 'agoric',
      },
    ]);

    // Third entry, ibc denom of stToken from elys chain
    
    const ibcDenomOfStTokenOnElysFromStride = computeHash(`transfer/${connectionDataFromStrideToElys.transferChannel.counterPartyChannelId}/st${stakingDenom}`);
    const ibcDenomOfStTokenOnAgoricFromElys = computeHash(`transfer/${connectionDataFromElysToAgoric.transferChannel.counterPartyChannelId}/transfer/${connectionDataFromStrideToElys.transferChannel.counterPartyChannelId}/st${stakingDenom}`);
    result.push([
      `ibc/${ibcDenomOfStTokenOnAgoricFromElys}`,
      {
        baseDenom: ibcDenomOfStTokenOnElysFromStride,
        baseName: 'elys',
        chainName: 'agoric',
      },
    ]);
  }

  return result;
};

// Generate the configuration
// try {
//   const config = generateAssetListConfig(chainInfo);
//   console.log(JSON.stringify(config, null, 2));
// } catch (error) {
//   console.error('Error generating config:', error.message);
// }