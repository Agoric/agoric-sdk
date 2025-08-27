//@ts-nocheck
import * as _0 from './swingset/genesis.js';
import * as _1 from './swingset/msgs.js';
import * as _2 from './swingset/query.js';
import * as _3 from './swingset/swingset.js';
import * as _4 from './vbank/genesis.js';
import * as _5 from './vbank/msgs.js';
import * as _6 from './vbank/query.js';
import * as _7 from './vbank/vbank.js';
import * as _8 from './vibc/msgs.js';
import * as _9 from './vlocalchain/vlocalchain.js';
import * as _10 from './vstorage/genesis.js';
import * as _11 from './vstorage/query.js';
import * as _12 from './vstorage/vstorage.js';
import * as _13 from './vtransfer/genesis.js';
import * as _212 from './swingset/query.rpc.Query.js';
import * as _213 from './vbank/query.rpc.Query.js';
import * as _214 from './vstorage/query.rpc.Query.js';
import * as _215 from './swingset/msgs.rpc.msg.js';
import * as _216 from './vibc/msgs.rpc.msg.js';
import * as _271 from './rpc.query.js';
import * as _272 from './rpc.tx.js';
export namespace agoric {
  export const swingset = {
    ..._0,
    ..._1,
    ..._2,
    ..._3,
    ..._212,
    ..._215,
  };
  export const vbank = {
    ..._4,
    ..._5,
    ..._6,
    ..._7,
    ..._213,
  };
  export const vibc = {
    ..._8,
    ..._216,
  };
  export const vlocalchain = {
    ..._9,
  };
  export const vstorage = {
    ..._10,
    ..._11,
    ..._12,
    ..._214,
  };
  export const vtransfer = {
    ..._13,
  };
  export const ClientFactory = {
    ..._271,
    ..._272,
  };
}
