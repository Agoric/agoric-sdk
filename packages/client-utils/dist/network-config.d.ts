export function toNetworkConfigUrl(agoricNetSubdomain: any): string;
export function toRpcUrl(agoricNetSubdomain: any): string;
export namespace LOCAL_CONFIG {
    let chainName: string;
    let rpcAddrs: string[];
}
export const LOCAL_CONFIG_KEY: "local";
export function parseNetworkSpec(spec: string): {
    domain: string;
    subdomain?: string;
    fqdn?: string;
    chainId?: string;
} & ({
    subdomain: string;
} | {
    fqdn: string;
});
export function fetchNetworkConfig(spec: string, { fetch }: {
    fetch: typeof globalThis.fetch;
}): Promise<MinimalNetworkConfig>;
export type MinimalNetworkConfig = {
    /**
     * a Cosmos Chain ID (cf. https://evm.cosmos.network/docs/next/documentation/concepts/chain-id and https://github.com/cosmos/chain-registry )
     */
    chainName: string;
    /**
     * endpoints that are expected to respond to cosmos-sdk RPC requests
     */
    rpcAddrs: string[];
};
//# sourceMappingURL=network-config.d.ts.map