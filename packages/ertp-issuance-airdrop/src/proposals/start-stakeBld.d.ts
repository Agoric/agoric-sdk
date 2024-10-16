export function startStakeBld({ consume: { agoricNames: agoricNamesP, board, chainStorage, chainTimerService: chainTimerServiceP, localchain, startUpgradable, }, installation: { consume: { stakeBld }, }, instance: { produce: { stakeBld: produceInstance }, }, issuer: { consume: { [Stake.symbol]: stakeIssuer }, }, }: BootstrapPowers & {
    installation: {
        consume: {
            stakeBld: Installation<any>;
        };
    };
}): Promise<void>;
export function getManifestForStakeBld({ restoreRef }: {
    restoreRef: any;
}, { installKeys }: {
    installKeys: any;
}): {
    manifest: {
        [x: string]: {
            consume: {
                agoricNames: boolean;
                board: boolean;
                chainStorage: boolean;
                chainTimerService: boolean;
                localchain: boolean;
                startUpgradable: boolean;
            };
            installation: {
                consume: {
                    stakeBld: boolean;
                };
            };
            instance: {
                produce: {
                    stakeBld: boolean;
                };
            };
            issuer: {
                consume: {
                    BLD: boolean;
                };
            };
        };
    };
    installations: {
        stakeBld: any;
    };
};
import { Stake } from '@agoric/internal/src/tokens.js';
//# sourceMappingURL=start-stakeBld.d.ts.map