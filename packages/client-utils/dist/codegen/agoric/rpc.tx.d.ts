import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
export declare const createRPCMsgClient: ({ rpc }: {
    rpc: Rpc;
}) => Promise<{
    cosmos: {
        vesting: {
            v1beta1: import("../cosmos/vesting/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        upgrade: {
            v1beta1: import("../cosmos/upgrade/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        staking: {
            v1beta1: import("../cosmos/staking/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        mint: {
            v1beta1: import("../cosmos/mint/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        group: {
            v1: import("../cosmos/group/v1/tx.rpc.msg.js").MsgClientImpl;
        };
        gov: {
            v1beta1: import("../cosmos/gov/v1beta1/tx.rpc.msg.js").MsgClientImpl;
            v1: import("../cosmos/gov/v1/tx.rpc.msg.js").MsgClientImpl;
        };
        feegrant: {
            v1beta1: import("../cosmos/feegrant/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        distribution: {
            v1beta1: import("../cosmos/distribution/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        consensus: {
            v1: import("../cosmos/consensus/v1/tx.rpc.msg.js").MsgClientImpl;
        };
        circuit: {
            v1: import("../cosmos/circuit/v1/tx.rpc.msg.js").MsgClientImpl;
        };
        bank: {
            v1beta1: import("../cosmos/bank/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        authz: {
            v1beta1: import("../cosmos/authz/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
        auth: {
            v1beta1: import("../cosmos/auth/v1beta1/tx.rpc.msg.js").MsgClientImpl;
        };
    };
    agoric: {
        vibc: import("./vibc/msgs.rpc.msg.js").MsgClientImpl;
        swingset: import("./swingset/msgs.rpc.msg.js").MsgClientImpl;
    };
}>;
//# sourceMappingURL=rpc.tx.d.ts.map