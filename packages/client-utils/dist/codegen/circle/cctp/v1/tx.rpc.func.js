//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgDepositForBurn, MsgDepositForBurnWithCaller, } from '@agoric/cosmic-proto/codegen/circle/cctp/v1/tx.js';
/**
 * @name depositForBurn
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.DepositForBurn
 */
export const depositForBurn = buildTx({
    msg: MsgDepositForBurn,
});
/**
 * @name depositForBurnWithCaller
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.DepositForBurnWithCaller
 */
export const depositForBurnWithCaller = buildTx({
    msg: MsgDepositForBurnWithCaller,
});
//# sourceMappingURL=tx.rpc.func.js.map