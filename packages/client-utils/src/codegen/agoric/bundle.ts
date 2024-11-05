//@ts-nocheck
import * as _0 from './lien/genesis.js';
import * as _1 from './lien/lien.js';
import * as _2 from './swingset/genesis.js';
import * as _3 from './swingset/msgs.js';
import * as _4 from './swingset/query.js';
import * as _5 from './swingset/swingset.js';
import * as _6 from './vbank/genesis.js';
import * as _7 from './vbank/msgs.js';
import * as _8 from './vbank/query.js';
import * as _9 from './vbank/vbank.js';
import * as _10 from './vibc/msgs.js';
import * as _11 from './vlocalchain/vlocalchain.js';
import * as _12 from './vstorage/genesis.js';
import * as _13 from './vstorage/query.js';
import * as _14 from './vstorage/vstorage.js';
import * as _15 from './vtransfer/genesis.js';
import * as _214 from './swingset/query.rpc.Query.js';
import * as _215 from './vbank/query.rpc.Query.js';
import * as _216 from './vstorage/query.rpc.Query.js';
import * as _217 from './swingset/msgs.rpc.msg.js';
import * as _218 from './vibc/msgs.rpc.msg.js';
import * as _273 from './rpc.query.js';
import * as _274 from './rpc.tx.js';
export namespace agoric {
  export const lien = {
    ..._0,
    ..._1,
  };
  export const swingset = {
    ..._2,
    ..._3,
    ..._4,
    ..._5,
    ..._214,
    ..._217,
  };
  export const vbank = {
    ..._6,
    ..._7,
    ..._8,
    ..._9,
    ..._215,
  };
  export const vibc = {
    ..._10,
    ..._218,
  };
  export const vlocalchain = {
    ..._11,
  };
  export const vstorage = {
    ..._12,
    ..._13,
    ..._14,
    ..._216,
  };
  export const vtransfer = {
    ..._15,
  };
  export const ClientFactory = {
    ..._273,
    ..._274,
  };
}
