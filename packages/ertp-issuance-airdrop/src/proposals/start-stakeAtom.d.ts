export function startStakeAtom({ consume: { agoricNames, board, chainStorage, chainTimerService: timer, cosmosInterchainService, startUpgradable, }, installation: { consume: { stakeIca }, }, instance: { produce: { stakeAtom: produceInstance }, }, }: BootstrapPowers & {
    installation: {
        consume: {
            stakeIca: Installation<any>;
        };
    };
}): Promise<void>;
export function getManifestForStakeAtom({ restoreRef }: {
    restoreRef: any;
}, { installKeys, ...options }: {
    [x: string]: any;
    installKeys: any;
}): {
    manifest: {
        [x: string]: {
            consume: {
                agoricNames: boolean;
                board: boolean;
                chainStorage: boolean;
                chainTimerService: boolean;
                cosmosInterchainService: boolean;
                startUpgradable: boolean;
            };
            installation: {
                consume: {
                    stakeIca: boolean;
                };
            };
            instance: {
                produce: {
                    stakeAtom: boolean;
                };
            };
        };
    };
    installations: {
        stakeIca: any;
    };
    options: {
        [x: string]: any;
    };
};
//# sourceMappingURL=start-stakeAtom.d.ts.map