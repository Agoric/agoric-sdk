import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
export declare const createRPCMsgClient: ({ rpc }: {
    rpc: Rpc;
}) => Promise<{
    cosmos: {
        vesting: {
            v1beta1: import("./vesting/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        upgrade: {
            v1beta1: import("./upgrade/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        staking: {
            v1beta1: import("./staking/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        mint: {
            v1beta1: import("./mint/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        group: {
            v1: import("./group/v1/tx.rpc.msg.js").MsgClientImpl;
        };
        gov: {
            v1beta1: import("./gov/v1beta1/tx.rpc.msg.js").MsgClientImpl;
            v1: import("./gov/v1/tx.rpc.msg.js").MsgClientImpl;
        };
        feegrant: {
            v1beta1: import("./feegrant/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        distribution: {
            v1beta1: import("./distribution/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        consensus: {
            v1: import("./consensus/v1/tx.rpc.msg.js").MsgClientImpl;
        };
        circuit: {
            v1: import("./circuit/v1/tx.rpc.msg.js").MsgClientImpl;
        };
        bank: {
            v1beta1: import("./bank/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        authz: {
            v1beta1: import("./authz/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        auth: {
            v1beta1: import("./auth/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
    };
}>;
//# sourceMappingURL=rpc.tx.d.ts.map