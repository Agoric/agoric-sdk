export function makeClientMarshaller(valToSlot?: (v: unknown) => string): {
    toCapData: import("@endo/marshal").ToCapData<string | null>;
    fromCapData: import("@endo/marshal").FromCapData<string | null>;
    serialize: import("@endo/marshal").ToCapData<string | null>;
    unserialize: import("@endo/marshal").FromCapData<string | null>;
};
/**
 * The null slot indicates that identity is not intended to be preserved.
 */
export type WildSlot = string | null;
//# sourceMappingURL=marshalTables.d.ts.map