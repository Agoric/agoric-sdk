//@ts-nocheck
import * as _165 from "./v1/genesis.js";
import * as _166 from "./v1/icq.js";
import * as _167 from "./v1/packet.js";
import * as _168 from "./v1/query.js";
import * as _169 from "./v1/tx.js";
import * as _256 from "./v1/query.rpc.Query.js";
import * as _257 from "./v1/tx.rpc.msg.js";
import * as _274 from "./rpc.query.js";
import * as _275 from "./rpc.tx.js";
export namespace icq {
  export const v1 = {
    ..._165,
    ..._166,
    ..._167,
    ..._168,
    ..._169,
    ..._256,
    ..._257
  };
  export const ClientFactory = {
    ..._274,
    ..._275
  };
}