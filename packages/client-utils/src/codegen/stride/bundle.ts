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
import * as _226 from './staketia/query.rpc.Query.js';
import * as _227 from './stakeibc/query.rpc.Query.js';
import * as _228 from './stakedym/query.rpc.Query.js';
import * as _229 from './records/query.rpc.Query.js';
import * as _230 from './epochs/query.rpc.Query.js';
import * as _231 from './staketia/tx.rpc.msg.js';
import * as _232 from './stakeibc/tx.rpc.msg.js';
import * as _233 from './stakedym/tx.rpc.msg.js';
import * as _289 from './rpc.query.js';
import * as _290 from './rpc.tx.js';
export namespace stride {
  export const staketia = {
    ..._11,
    ..._12,
    ..._13,
    ..._14,
    ..._226,
    ..._231,
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
  };
  export const stakedym = {
    ..._28,
    ..._29,
    ..._30,
    ..._31,
    ..._228,
    ..._233,
  };
  export const records = {
    ..._32,
    ..._33,
    ..._34,
    ..._35,
    ..._36,
    ..._229,
  };
  export const epochs = {
    ..._37,
    ..._38,
    ..._230,
  };
  export const ClientFactory = {
    ..._289,
    ..._290,
  };
}
