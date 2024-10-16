export function startBasicFlows({ consume: { agoricNames, board, chainStorage, chainTimerService, cosmosInterchainService, localchain, startUpgradable, }, installation: { consume: { [contractName]: installation }, }, instance: { produce: { [contractName]: produceInstance }, }, }: BootstrapPowers): Promise<void>;
export function getManifestForContract({ restoreRef }: {
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
                localchain: boolean;
                startUpgradable: boolean;
            };
            installation: {
                consume: {
                    basicFlows: boolean;
                };
            };
            instance: {
                produce: {
                    basicFlows: boolean;
                };
            };
        };
    };
    installations: {
        basicFlows: any;
    };
    options: {
        [x: string]: any;
    };
};
declare const contractName: "basicFlows";
export {};
//# sourceMappingURL=start-basic-flows.d.ts.map