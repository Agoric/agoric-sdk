export function pickEndpoint({ rpcAddrs }: {
    rpcAddrs: any;
}): any;
export function makeTendermint34Client(endpoint: string, { fetch }: {
    fetch: typeof window.fetch;
}): Tendermint34Client;
export function makeStargateClient(config: MinimalNetworkConfig, { fetch }: {
    fetch: typeof window.fetch;
}): StargateClient;
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import type { MinimalNetworkConfig } from './network-config.js';
import { StargateClient } from '@cosmjs/stargate';
//# sourceMappingURL=rpc.d.ts.map