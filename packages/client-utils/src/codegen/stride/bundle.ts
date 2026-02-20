//@ts-nocheck
import * as _11 from './staketia/tx.js';
import * as _12 from './staketia/staketia.js';
import * as _13 from './staketia/query.js';
import * as _14 from './staketia/genesis.js';
import * as _15 from './stakeibc/validator.js';
import * as _16 from './stakeibc/tx.js';
import * as _17 from './stakeibc/trade_route.js';
import * as _18 from './stakeibc/query.js';
import * as _19 from './stakeibc/params.js';
import * as _20 from './stakeibc/packet.js';
import * as _21 from './stakeibc/ica_account.js';
import * as _22 from './stakeibc/host_zone.js';
import * as _23 from './stakeibc/gov.js';
import * as _24 from './stakeibc/genesis.js';
import * as _25 from './stakeibc/epoch_tracker.js';
import * as _26 from './stakeibc/callbacks.js';
import * as _27 from './stakeibc/address_unbonding.js';
import * as _28 from './stakedym/tx.js';
import * as _29 from './stakedym/stakedym.js';
import * as _30 from './stakedym/query.js';
import * as _31 from './stakedym/genesis.js';
import * as _32 from './records/records.js';
import * as _33 from './records/query.js';
import * as _34 from './records/params.js';
import * as _35 from './records/genesis.js';
import * as _36 from './records/callbacks.js';
import * as _37 from './epochs/query.js';
import * as _38 from './epochs/genesis.js';
import * as _226 from './staketia/query.rpc.func.js';
import * as _227 from './stakeibc/query.rpc.func.js';
import * as _228 from './stakedym/query.rpc.func.js';
import * as _229 from './records/query.rpc.func.js';
import * as _230 from './epochs/query.rpc.func.js';
import * as _231 from './staketia/query.rpc.Query.js';
import * as _232 from './stakeibc/query.rpc.Query.js';
import * as _233 from './stakedym/query.rpc.Query.js';
import * as _234 from './records/query.rpc.Query.js';
import * as _235 from './epochs/query.rpc.Query.js';
import * as _236 from './staketia/tx.rpc.func.js';
import * as _237 from './stakeibc/tx.rpc.func.js';
import * as _238 from './stakedym/tx.rpc.func.js';
import * as _239 from './staketia/tx.rpc.msg.js';
import * as _240 from './stakeibc/tx.rpc.msg.js';
import * as _241 from './stakedym/tx.rpc.msg.js';
import * as _354 from './rpc.query.js';
import * as _355 from './rpc.tx.js';
export namespace stride {
  export const staketia = {
    ..._11,
    ..._12,
    ..._13,
    ..._14,
    ..._226,
    ..._231,
    ..._236,
    ..._239,
  };
  export const stakeibc = {
    ..._15,
    ..._16,
    ..._17,
    ..._18,
    ..._19,
    ..._20,
    ..._21,
    ..._22,
    ..._23,
    ..._24,
    ..._25,
    ..._26,
    ..._27,
    ..._227,
    ..._232,
    ..._237,
    ..._240,
  };
  export const stakedym = {
    ..._28,
    ..._29,
    ..._30,
    ..._31,
    ..._228,
    ..._233,
    ..._238,
    ..._241,
  };
  export const records = {
    ..._32,
    ..._33,
    ..._34,
    ..._35,
    ..._36,
    ..._229,
    ..._234,
  };
  export const epochs = {
    ..._37,
    ..._38,
    ..._230,
    ..._235,
  };
  export const ClientFactory = {
    ..._354,
    ..._355,
  };
}
