//@ts-nocheck
import * as _187 from './epochs/genesis.js';
import * as _188 from './epochs/query.js';
import * as _189 from './records/callbacks.js';
import * as _190 from './records/genesis.js';
import * as _191 from './records/params.js';
import * as _192 from './records/query.js';
import * as _193 from './records/records.js';
import * as _194 from './stakedym/genesis.js';
import * as _195 from './stakedym/query.js';
import * as _196 from './stakedym/stakedym.js';
import * as _197 from './stakedym/tx.js';
import * as _198 from './stakeibc/address_unbonding.js';
import * as _199 from './stakeibc/callbacks.js';
import * as _200 from './stakeibc/epoch_tracker.js';
import * as _201 from './stakeibc/genesis.js';
import * as _202 from './stakeibc/gov.js';
import * as _203 from './stakeibc/host_zone.js';
import * as _204 from './stakeibc/ica_account.js';
import * as _205 from './stakeibc/packet.js';
import * as _206 from './stakeibc/params.js';
import * as _207 from './stakeibc/query.js';
import * as _208 from './stakeibc/trade_route.js';
import * as _209 from './stakeibc/tx.js';
import * as _210 from './stakeibc/validator.js';
import * as _211 from './staketia/genesis.js';
import * as _212 from './staketia/query.js';
import * as _213 from './staketia/staketia.js';
import * as _214 from './staketia/tx.js';
import * as _281 from './epochs/query.rpc.Query.js';
import * as _282 from './records/query.rpc.Query.js';
import * as _283 from './stakedym/query.rpc.Query.js';
import * as _284 from './stakeibc/query.rpc.Query.js';
import * as _285 from './staketia/query.rpc.Query.js';
import * as _286 from './stakedym/tx.rpc.msg.js';
import * as _287 from './stakeibc/tx.rpc.msg.js';
import * as _288 from './staketia/tx.rpc.msg.js';
import * as _300 from './rpc.query.js';
import * as _301 from './rpc.tx.js';
export namespace stride {
  export const epochs = {
    ..._187,
    ..._188,
    ..._281,
  };
  export const records = {
    ..._189,
    ..._190,
    ..._191,
    ..._192,
    ..._193,
    ..._282,
  };
  export const stakedym = {
    ..._194,
    ..._195,
    ..._196,
    ..._197,
    ..._283,
    ..._286,
  };
  export const stakeibc = {
    ..._198,
    ..._199,
    ..._200,
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
    ..._284,
    ..._287,
  };
  export const staketia = {
    ..._211,
    ..._212,
    ..._213,
    ..._214,
    ..._285,
    ..._288,
  };
  export const ClientFactory = {
    ..._300,
    ..._301,
  };
}
