/** Info for an Ethereum-based chain. */
export type EthChainInfo = Readonly<{
  // TODO https://github.com/Agoric/agoric-private/issues/250
  cctpDestinationDomain?: number;
  chainId: string;
  allegedName: string;
}>;
