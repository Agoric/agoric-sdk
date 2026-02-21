import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
export declare const createRPCMsgClient: ({ rpc }: {
    rpc: Rpc;
}) => Promise<{
    ibc: {
        lightclients: {
            wasm: {
                v1: import("./lightclients/wasm/v1/tx.rpc.msg.js").MsgClientImpl;
            };
        };
        core: {
            connection: {
                v1: import("./core/connection/v1/tx.rpc.msg.js").MsgClientImpl;
            };
            client: {
                v1: import("./core/client/v1/tx.rpc.msg.js").MsgClientImpl;
            };
            channel: {
                v1: import("./core/channel/v1/tx.rpc.msg.js").MsgClientImpl;
            };
        };
        applications: {
            transfer: {
                v1: import("./applications/transfer/v1/tx.rpc.msg.js").MsgClientImpl;
            };
            interchain_accounts: {
                host: {
                    v1: import("./applications/interchain_accounts/host/v1/tx.rpc.msg.js").MsgClientImpl;
                };
                controller: {
                    v1: import("./applications/interchain_accounts/controller/v1/tx.rpc.msg.js").MsgClientImpl;
                };
            };
        };
    };
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
}>;
//# sourceMappingURL=rpc.tx.d.ts.map