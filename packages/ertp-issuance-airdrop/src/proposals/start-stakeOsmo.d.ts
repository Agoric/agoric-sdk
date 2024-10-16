export function startStakeOsmo({ consume: { agoricNames, board, chainStorage, chainTimerService: timer, cosmosInterchainService, startUpgradable, }, installation: { consume: { stakeIca }, }, instance: { produce: { stakeOsmo: produceInstance }, }, }: BootstrapPowers & {
    installation: {
        consume: {
            stakeIca: Installation<any>;
        };
    };
    instance: {
        produce: {
            stakeOsmo: any;
        };
    };
}): Promise<void>;
export function getManifestForStakeOsmo({ restoreRef }: {
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
                    stakeOsmo: boolean;
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
//# sourceMappingURL=start-stakeOsmo.d.ts.map