//@ts-nocheck
import * as _212 from './vtransfer/genesis.js';
import * as _213 from './vstorage/vstorage.js';
import * as _214 from './vstorage/query.js';
import * as _215 from './vstorage/genesis.js';
import * as _216 from './vlocalchain/vlocalchain.js';
import * as _217 from './vibc/msgs.js';
import * as _218 from './vbank/vbank.js';
import * as _219 from './vbank/query.js';
import * as _220 from './vbank/msgs.js';
import * as _221 from './vbank/genesis.js';
import * as _222 from './swingset/swingset.js';
import * as _223 from './swingset/query.js';
import * as _224 from './swingset/msgs.js';
import * as _225 from './swingset/genesis.js';
import * as _284 from './vstorage/query.rpc.Query.js';
import * as _285 from './vbank/query.rpc.Query.js';
import * as _286 from './swingset/query.rpc.Query.js';
import * as _287 from './vibc/msgs.rpc.msg.js';
import * as _288 from './swingset/msgs.rpc.msg.js';
import * as _300 from './rpc.query.js';
import * as _301 from './rpc.tx.js';
export namespace agoric {
  export const vtransfer = {
    ..._212,
  };
  export const vstorage = {
    ..._213,
    ..._214,
    ..._215,
    ..._284,
  };
  export const vlocalchain = {
    ..._216,
  };
  export const vibc = {
    ..._217,
    ..._287,
  };
  export const vbank = {
    ..._218,
    ..._219,
    ..._220,
    ..._221,
    ..._285,
  };
  export const swingset = {
    ..._222,
    ..._223,
    ..._224,
    ..._225,
    ..._286,
    ..._288,
  };
  export const ClientFactory = {
    ..._300,
    ..._301,
  };
}
