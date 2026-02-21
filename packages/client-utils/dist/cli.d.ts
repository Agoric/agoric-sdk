export function fetchEnvNetworkConfig({ env, fetch }: {
    env: typeof process.env;
    fetch: typeof globalThis.fetch;
}): Promise<MinimalNetworkConfig>;
import type { MinimalNetworkConfig } from './network-config.js';
//# sourceMappingURL=cli.d.ts.map