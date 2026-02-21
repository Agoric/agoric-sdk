import { SigningStargateClient } from '@cosmjs/stargate';
export declare const makeStargateClientKit: (mnemonic: string, { prefix, hdPath, rpcAddr, connectWithSigner, }: {
    prefix?: string;
    hdPath?: string;
    rpcAddr: string;
    connectWithSigner: typeof SigningStargateClient.connectWithSigner;
}) => Promise<Readonly<{
    address: string;
    client: SigningStargateClient;
}>>;
//# sourceMappingURL=signing-client.d.ts.map