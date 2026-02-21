export function makeAgoricQueryClient(config: MinimalNetworkConfig): Promise<AgoricQueryClient>;
export type AgoricQueryClient = Awaited<ReturnType<typeof createRPCQueryClient>>;
import type { MinimalNetworkConfig } from './network-config.js';
import { createRPCQueryClient } from './codegen/agoric/rpc.query.js';
//# sourceMappingURL=clients.d.ts.map