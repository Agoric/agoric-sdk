export function pollBlocks(opts: {
    client: StargateClient;
    delay: (ms: number) => Promise<void>;
    period?: number;
    retryMessage?: string;
}): <T>(l: (b: {
    time: string;
    height: number;
}) => Promise<T>) => Promise<T>;
import type { StargateClient } from '@cosmjs/stargate';
//# sourceMappingURL=chain.d.ts.map