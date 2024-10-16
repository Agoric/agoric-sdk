export function reviseChainInfo({ consume: { agoricNamesAdmin } }: BootstrapPowers, { options: { chainInfo } }: {
    options: {
        chainInfo: Record<string, registerChain>;
    };
}): Promise<void>;
export function getManifestForReviseChains(_powers: any, { chainInfo }: {
    chainInfo: any;
}): {
    manifest: {
        [x: string]: {
            consume: {
                agoricNamesAdmin: boolean;
            };
        };
    };
    options: {
        chainInfo: any;
    };
};
//# sourceMappingURL=revise-chain-info.d.ts.map