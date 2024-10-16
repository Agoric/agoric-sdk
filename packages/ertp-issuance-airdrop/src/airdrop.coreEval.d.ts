export function installContract({ consume: { zoe }, installation: { produce: produceInstallation } }: BootstrapPowers, { name, bundleID }: {
    name: string;
    bundleID: string;
}): Promise<any>;
export function startContract(powers: BootstrapPowers, config?: {
    name: string;
    startArgs?: StartArgs;
    issuerNames?: string[];
    merkleRoot: string;
}): Promise<any>;
export namespace AmountMath {
    function make<K extends AssetKind>(brand: Brand<K>, value: any): {
        brand: globalThis.Brand<K>;
        value: any;
    };
}
/** @type {(name: string) => void} */
export const assertPathSegment: (name: string) => void;
/** @type {(name: string) => string} */
export const sanitizePathSegment: (name: string) => string;
/**
 * Given a permitted name, start a contract instance; save upgrade info; publish instance.
 * Optionally: publish issuers/brands.
 *
 * Note: publishing brands requires brandAuxPublisher from board-aux.core.js.
 */
export type StartArgs = Partial<Parameters<Awaited<BootstrapPowers>>[0]>;
//# sourceMappingURL=airdrop.coreEval.d.ts.map