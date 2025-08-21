//@ts-nocheck
import * as _190 from './epochs/genesis.js';
import * as _191 from './epochs/query.js';
import * as _192 from './records/callbacks.js';
import * as _193 from './records/genesis.js';
import * as _194 from './records/params.js';
import * as _195 from './records/query.js';
import * as _196 from './records/records.js';
import * as _197 from './stakedym/genesis.js';
import * as _198 from './stakedym/query.js';
import * as _199 from './stakedym/stakedym.js';
import * as _200 from './stakedym/tx.js';
import * as _201 from './stakeibc/address_unbonding.js';
import * as _202 from './stakeibc/callbacks.js';
import * as _203 from './stakeibc/epoch_tracker.js';
import * as _204 from './stakeibc/genesis.js';
import * as _205 from './stakeibc/gov.js';
import * as _206 from './stakeibc/host_zone.js';
import * as _207 from './stakeibc/ica_account.js';
import * as _208 from './stakeibc/packet.js';
import * as _209 from './stakeibc/params.js';
import * as _210 from './stakeibc/query.js';
import * as _211 from './stakeibc/trade_route.js';
import * as _212 from './stakeibc/tx.js';
import * as _213 from './stakeibc/validator.js';
import * as _214 from './staketia/genesis.js';
import * as _215 from './staketia/query.js';
import * as _216 from './staketia/staketia.js';
import * as _217 from './staketia/tx.js';
import * as _284 from './epochs/query.rpc.Query.js';
import * as _285 from './records/query.rpc.Query.js';
import * as _286 from './stakedym/query.rpc.Query.js';
import * as _287 from './stakeibc/query.rpc.Query.js';
import * as _288 from './staketia/query.rpc.Query.js';
import * as _289 from './stakedym/tx.rpc.msg.js';
import * as _290 from './stakeibc/tx.rpc.msg.js';
import * as _291 from './staketia/tx.rpc.msg.js';
import * as _303 from './rpc.query.js';
import * as _304 from './rpc.tx.js';
export namespace stride {
  export const epochs = {
    ..._190,
    ..._191,
    ..._284,
  };
  export const records = {
    ..._192,
    ..._193,
    ..._194,
    ..._195,
    ..._196,
    ..._285,
  };
  export const stakedym = {
    ..._197,
    ..._198,
    ..._199,
    ..._200,
    ..._286,
    ..._289,
  };
  export const stakeibc = {
    ..._201,
    ..._202,
    ..._203,
    ..._204,
    ..._205,
    ..._206,
    ..._207,
    ..._208,
    ..._209,
    ..._210,
    ..._211,
    ..._212,
    ..._213,
    ..._287,
    ..._290,
  };
  export const staketia = {
    ..._214,
    ..._215,
    ..._216,
    ..._217,
    ..._288,
    ..._291,
  };
  export const ClientFactory = {
    ..._303,
    ..._304,
  };
}
