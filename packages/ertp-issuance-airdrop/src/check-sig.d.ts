export function toBech32(prefix: any, data: any, limit: any): any;
export function pkToAddress(prefix: any): (initialValue: any) => any;
export const pubkeyToAgoricAddress: (initialValue: any) => any;
export const pubkeyToCosmosAddress: (initialValue: any) => any;
export function pubkeyToAddress(pubkey: string, prefix: string): any;
export function checkSig(kSig: KeplrSig, signer: Address): Promise<void>;
export type Address = string;
export type Base64 = string;
export type KeplrSig = {
    pub_key: {
        type: "tendermint/PubKeySecp256k1";
        value: Base64;
    };
    signature: Base64;
};
//# sourceMappingURL=check-sig.d.ts.map