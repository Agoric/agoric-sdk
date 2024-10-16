export function produceEndoModules(permittedPowers: BootstrapPowers & Endo1Space): void;
/** @type {import('@agoric/vats/src/core/lib-boot').BootstrapManifestPermit} */
export const permit: import("@agoric/vats/src/core/lib-boot").BootstrapManifestPermit;
export function main(permittedPowers: BootstrapPowers & Endo1Space): void;
export type Endo1Modules = {
    endo1: {
        marshal: typeof import("@endo/marshal");
        patterns: typeof import("@endo/patterns");
    };
};
export type Endo1Space = PromiseSpaceOf<Endo1Modules>;
//# sourceMappingURL=endo1.core.d.ts.map