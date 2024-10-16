export function installContract({ consume: { zoe }, installation: { produce: produceInstallation } }: BootstrapPowers, { name, bundleID }: {
    name: string;
    bundleID: string;
}): Promise<Installation<any>>;
export function startContract(powers: BootstrapPowers, { name, startArgs, issuerNames }: {
    name: string;
    startArgs?: StartArgs;
    issuerNames?: string[];
}): Promise<{
    instance: import("@agoric/zoe/src/zoeService/utils").Instance<import("@agoric/zoe/src/zoeService/utils").ContractStartFunction>;
    adminFacet: import("@agoric/zoe/src/zoeService/utils").AdminFacet<import("@agoric/zoe/src/zoeService/utils").ContractStartFunction>;
    creatorFacet: {};
    publicFacet: {};
} & {
    creatorFacet?: {};
    publicFacet?: {};
} & {
    label: string;
}>;
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
export type StartArgs = Partial<Parameters<Awaited<BootstrapPowers["consume"]["startUpgradable"]>>[0]>;
//# sourceMappingURL=start-contract.d.ts.map