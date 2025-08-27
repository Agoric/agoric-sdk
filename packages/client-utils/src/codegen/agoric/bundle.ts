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
import * as _226 from './swingset/query.rpc.Query.js';
import * as _227 from './vbank/query.rpc.Query.js';
import * as _228 from './vstorage/query.rpc.Query.js';
import * as _229 from './swingset/msgs.rpc.msg.js';
import * as _230 from './vibc/msgs.rpc.msg.js';
import * as _289 from './rpc.query.js';
import * as _290 from './rpc.tx.js';
export namespace agoric {
  export const swingset = {
    ..._0,
    ..._1,
    ..._2,
    ..._3,
    ..._226,
    ..._229,
  };
  export const vbank = {
    ..._4,
    ..._5,
    ..._6,
    ..._7,
    ..._227,
  };
  export const vibc = {
    ..._8,
    ..._230,
  };
  export const vlocalchain = {
    ..._9,
  };
  export const vstorage = {
    ..._10,
    ..._11,
    ..._12,
    ..._228,
  };
  export const vtransfer = {
    ..._13,
  };
  export const ClientFactory = {
    ..._289,
    ..._290,
  };
}
