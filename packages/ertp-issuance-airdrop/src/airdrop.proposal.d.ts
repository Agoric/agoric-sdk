export namespace defaultCustomTerms {
    let startTime: bigint;
    let initialPayoutValues: bigint[];
    let targetNumberOfEpochs: number;
    let targetEpochLength: bigint;
    let targetTokenSupply: bigint;
    let tokenName: string;
}
export function makeTerms(terms?: {}): {
    startTime: bigint;
    initialPayoutValues: bigint[];
    targetNumberOfEpochs: number;
    targetEpochLength: bigint;
    targetTokenSupply: bigint;
    tokenName: string;
};
export function startAirdrop(powers: any, config: any): Promise<void>;
export function getManifestForAirdrop({ restoreRef }: {
    restoreRef: any;
}, { installKeys, options, }: {
    installKeys: any;
    options?: {
        customTerms: {
            merkleRoot: string;
            startTime: bigint;
            initialPayoutValues: bigint[];
            targetNumberOfEpochs: number;
            targetEpochLength: bigint;
            targetTokenSupply: bigint;
            tokenName: string;
        };
    } | undefined;
}): {
    manifest: BootstrapManifest;
    installations: {
        tribblesAirdrop: any;
    };
    options: {
        customTerms: {
            merkleRoot: string;
            startTime: bigint;
            initialPayoutValues: bigint[];
            targetNumberOfEpochs: number;
            targetEpochLength: bigint;
            targetTokenSupply: bigint;
            tokenName: string;
        };
    };
};
/**
 * Core eval script to start contract
 */
export type AirdropSpace = {
    brand: PromiseSpaceOf<{
        Tribbles: import("@agoric/ertp/src/types.js").Brand;
    }>;
    issuer: PromiseSpaceOf<{
        Tribbles: import("@agoric/ertp/src/types.js").Issuer;
    }>;
    instance: PromiseSpaceOf<{
        [contractName]: Instance;
    }>;
};
import type { BootstrapManifest } from '@agoric/vats/src/core/lib-boot.js';
declare const contractName: "tribblesAirdrop";
export {};
//# sourceMappingURL=airdrop.proposal.d.ts.map