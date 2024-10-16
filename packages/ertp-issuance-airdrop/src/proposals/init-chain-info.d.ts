export function initChainInfo({ consume: { agoricNamesAdmin, chainStorage: chainStorageP }, }: BootstrapPowers): Promise<void>;
export function getManifestForChainInfo(): {
    manifest: {
        [x: string]: {
            consume: {
                agoricNamesAdmin: boolean;
                chainStorage: boolean;
            };
        };
    };
};
//# sourceMappingURL=init-chain-info.d.ts.map