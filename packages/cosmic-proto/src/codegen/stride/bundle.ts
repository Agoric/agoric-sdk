//@ts-nocheck
import * as _140 from './epochs/genesis.js';
import * as _141 from './epochs/query.js';
import * as _142 from './records/callbacks.js';
import * as _143 from './records/genesis.js';
import * as _144 from './records/params.js';
import * as _145 from './records/query.js';
import * as _146 from './records/records.js';
import * as _147 from './stakedym/genesis.js';
import * as _148 from './stakedym/query.js';
import * as _149 from './stakedym/stakedym.js';
import * as _150 from './stakedym/tx.js';
import * as _151 from './stakeibc/address_unbonding.js';
import * as _152 from './stakeibc/callbacks.js';
import * as _153 from './stakeibc/epoch_tracker.js';
import * as _154 from './stakeibc/genesis.js';
import * as _155 from './stakeibc/gov.js';
import * as _156 from './stakeibc/host_zone.js';
import * as _157 from './stakeibc/ica_account.js';
import * as _158 from './stakeibc/packet.js';
import * as _159 from './stakeibc/params.js';
import * as _160 from './stakeibc/query.js';
import * as _161 from './stakeibc/trade_route.js';
import * as _162 from './stakeibc/tx.js';
import * as _163 from './stakeibc/validator.js';
import * as _164 from './staketia/genesis.js';
import * as _165 from './staketia/query.js';
import * as _166 from './staketia/staketia.js';
import * as _167 from './staketia/tx.js';
import * as _223 from './epochs/query.rpc.Query.js';
import * as _224 from './records/query.rpc.Query.js';
import * as _225 from './stakedym/query.rpc.Query.js';
import * as _226 from './stakeibc/query.rpc.Query.js';
import * as _227 from './staketia/query.rpc.Query.js';
import * as _228 from './stakedym/tx.rpc.msg.js';
import * as _229 from './stakeibc/tx.rpc.msg.js';
import * as _230 from './staketia/tx.rpc.msg.js';
import * as _241 from './rpc.query.js';
import * as _242 from './rpc.tx.js';
export namespace stride {
  export const epochs = {
    ..._140,
    ..._141,
    ..._223,
  };
  export const records = {
    ..._142,
    ..._143,
    ..._144,
    ..._145,
    ..._146,
    ..._224,
  };
  export const stakedym = {
    ..._147,
    ..._148,
    ..._149,
    ..._150,
    ..._225,
    ..._228,
  };
  export const stakeibc = {
    ..._151,
    ..._152,
    ..._153,
    ..._154,
    ..._155,
    ..._156,
    ..._157,
    ..._158,
    ..._159,
    ..._160,
    ..._161,
    ..._162,
    ..._163,
    ..._226,
    ..._229,
  };
  export const staketia = {
    ..._164,
    ..._165,
    ..._166,
    ..._167,
    ..._227,
    ..._230,
  };
  export const ClientFactory = {
    ..._241,
    ..._242,
  };
}
