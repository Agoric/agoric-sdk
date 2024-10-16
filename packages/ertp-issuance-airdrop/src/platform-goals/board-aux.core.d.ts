export const BOARD_AUX: "boardAux";
export function makeBoardAuxManager(zone: import("@agoric/zone").Zone, marshalData: Marshaller, powers: {
    board: ERef<import("@agoric/vats").Board>;
    chainStorage: ERef<StorageNode>;
}): {
    brandAuxPublisher: {
        publishBrandInfo: (brand: Brand) => Promise<void>;
    } & import("@endo/pass-style").RemotableObject<`Alleged: ${string}`> & import("@endo/eventual-send").RemotableBrand<{}, {
        publishBrandInfo: (brand: Brand) => Promise<void>;
    }>;
    boardAuxTOFU: {
        publishBrandInfo: (brand: Brand) => Promise<void>;
        init: (key: any, value: any) => Promise<void>;
    } & import("@endo/pass-style").RemotableObject<`Alleged: ${string}`> & import("@endo/eventual-send").RemotableBrand<{}, {
        publishBrandInfo: (brand: Brand) => Promise<void>;
        init: (key: any, value: any) => Promise<void>;
    }>;
    boardAuxAdmin: {
        publishBrandInfo: (brand: Brand) => Promise<void>;
        init: (key: any, value: any) => Promise<void>;
        update: (key: any, value: any) => Promise<void>;
    } & import("@endo/pass-style").RemotableObject<`Alleged: ${string}`> & import("@endo/eventual-send").RemotableBrand<{}, {
        publishBrandInfo: (brand: Brand) => Promise<void>;
        init: (key: any, value: any) => Promise<void>;
        update: (key: any, value: any) => Promise<void>;
    }>;
};
export namespace marshalData {
    function toCapData(d: any): {
        body: string;
        slots: never[];
    };
    function fromCapData(): never;
    function serialize(): never;
    function unserialize(): never;
}
export function produceBoardAuxManager(powers: BootstrapPowers): Promise<void>;
export namespace permit {
    let zone: boolean;
    namespace consume {
        let board: boolean;
        let chainStorage: boolean;
    }
    namespace produce {
        let brandAuxPublisher: boolean;
        let boardAuxAdmin: boolean;
    }
}
export function main(powers: BootstrapPowers): Promise<void>;
export type BoardAuxManager = ReturnType<typeof makeBoardAuxManager>;
export type BrandAuxPublisher = BoardAuxManager["brandAuxPublisher"];
export type BoardAuxTOFU = BoardAuxManager["boardAuxTOFU"];
export type BoardAuxAdmin = BoardAuxManager["boardAuxAdmin"];
export type BoardAuxPowers = PromiseSpaceOf<{
    brandAuxPublisher: BrandAuxPublisher;
    boardAuxTOFU: BoardAuxTOFU;
    boardAuxAdmin: BoardAuxAdmin;
}>;
//# sourceMappingURL=board-aux.core.d.ts.map